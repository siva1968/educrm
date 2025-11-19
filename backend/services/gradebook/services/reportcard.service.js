const db = require('../../../shared/config/database');
const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ConflictError, ValidationError } = require('../../../shared/utils/errors');

/**
 * Report Card Service
 * Handles report card generation, ranking, and management
 */

class ReportCardService {
  /**
   * Generate report card for a student
   * Aggregates all grades for the term and calculates overall performance
   */
  async generateReportCard(reportData, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const { student_id, school_id, class: className, academic_year, term, include_assessments, calculate_rank } = reportData;

      // Check if report card already exists
      const existingReport = await client.query(
        `SELECT report_id FROM academic.report_cards
         WHERE student_id = $1 AND academic_year = $2 AND term = $3 AND is_deleted = false`,
        [student_id, academic_year, term]
      );

      if (existingReport.rows.length > 0) {
        throw new ConflictError(`Report card already exists for ${term} ${academic_year}. Use update or delete first.`);
      }

      // Get all grades for this student in the academic year/term
      let gradesQuery = `
        SELECT
          sg.grade_id,
          sg.assessment_id,
          sg.marks_obtained,
          sg.percentage,
          sg.grade,
          sg.gpa,
          sg.is_passed,
          sg.is_absent,
          a.assessment_name,
          a.assessment_type,
          a.total_marks,
          a.weightage,
          s.subject_id,
          s.subject_name,
          s.subject_code,
          s.credits
        FROM academic.student_grades sg
        JOIN academic.assessments a ON sg.assessment_id = a.assessment_id
        JOIN academic.subjects s ON a.subject_id = s.subject_id
        WHERE sg.student_id = $1
          AND sg.is_deleted = false
          AND a.is_deleted = false
          AND a.class = $2
          AND a.academic_year = $3
      `;

      const params = [student_id, className, academic_year];

      // Filter by specific assessments if provided
      if (include_assessments && include_assessments.length > 0) {
        gradesQuery += ` AND sg.assessment_id = ANY($4)`;
        params.push(include_assessments);
      }

      gradesQuery += ` ORDER BY s.subject_name, a.assessment_type`;

      const gradesResult = await client.query(gradesQuery, params);

      if (gradesResult.rows.length === 0) {
        throw new ValidationError('No grades found for this student in the specified term. Cannot generate report card.');
      }

      // Group grades by subject
      const subjectGrades = this.groupGradesBySubject(gradesResult.rows);

      // Calculate subject-wise performance
      const subjectPerformance = this.calculateSubjectPerformance(subjectGrades);

      // Calculate overall performance
      const overallPerformance = this.calculateOverallPerformance(subjectPerformance);

      // Calculate class rank if requested
      let classRank = null;
      let totalStudents = null;

      if (calculate_rank) {
        const rankData = await this.calculateClassRank(
          client,
          student_id,
          className,
          academic_year,
          term,
          overallPerformance.overall_percentage
        );
        classRank = rankData.rank;
        totalStudents = rankData.total;
      }

      // Create report card record
      const reportId = uuidv4();

      const insertQuery = `
        INSERT INTO academic.report_cards (
          report_id, student_id, school_id, class, academic_year, term,
          total_marks_obtained, total_max_marks, overall_percentage,
          overall_grade, overall_gpa, class_rank, total_students,
          subject_grades, status, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        reportId,
        student_id,
        school_id,
        className,
        academic_year,
        term,
        overallPerformance.total_marks_obtained,
        overallPerformance.total_max_marks,
        overallPerformance.overall_percentage,
        overallPerformance.overall_grade,
        overallPerformance.overall_gpa,
        classRank,
        totalStudents,
        JSON.stringify(subjectPerformance),
        'Draft',
        userId,
        userId
      ]);

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Group grades by subject
   */
  groupGradesBySubject(grades) {
    const subjectMap = {};

    grades.forEach(grade => {
      const subjectId = grade.subject_id;

      if (!subjectMap[subjectId]) {
        subjectMap[subjectId] = {
          subject_id: subjectId,
          subject_name: grade.subject_name,
          subject_code: grade.subject_code,
          credits: grade.credits,
          grades: []
        };
      }

      subjectMap[subjectId].grades.push({
        assessment_id: grade.assessment_id,
        assessment_name: grade.assessment_name,
        assessment_type: grade.assessment_type,
        marks_obtained: grade.marks_obtained,
        total_marks: grade.total_marks,
        percentage: grade.percentage,
        grade: grade.grade,
        gpa: grade.gpa,
        weightage: grade.weightage,
        is_passed: grade.is_passed,
        is_absent: grade.is_absent
      });
    });

    return Object.values(subjectMap);
  }

  /**
   * Calculate subject-wise performance
   */
  calculateSubjectPerformance(subjectGrades) {
    return subjectGrades.map(subject => {
      const grades = subject.grades;

      // Calculate total marks
      const totalMarksObtained = grades.reduce((sum, g) => sum + (g.is_absent ? 0 : (g.marks_obtained || 0)), 0);
      const totalMaxMarks = grades.reduce((sum, g) => sum + (g.total_marks || 0), 0);
      const percentage = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;

      // Calculate weighted average if weightages exist
      const hasWeightage = grades.some(g => g.weightage > 0);
      let weightedPercentage = percentage;

      if (hasWeightage) {
        const totalWeightage = grades.reduce((sum, g) => sum + (g.weightage || 0), 0);
        if (totalWeightage > 0) {
          weightedPercentage = grades.reduce((sum, g) => {
            const weight = (g.weightage || 0) / totalWeightage;
            return sum + ((g.percentage || 0) * weight);
          }, 0);
        }
      }

      // Calculate average GPA
      const validGrades = grades.filter(g => !g.is_absent && g.gpa !== null);
      const averageGpa = validGrades.length > 0
        ? validGrades.reduce((sum, g) => sum + (g.gpa || 0), 0) / validGrades.length
        : null;

      // Determine overall grade for subject
      const subjectGrade = this.determineGrade(weightedPercentage);

      // Check if passed (all assessments passed or average >= 33%)
      const isPassed = grades.every(g => g.is_absent || g.is_passed) || percentage >= 33;

      return {
        subject_id: subject.subject_id,
        subject_name: subject.subject_name,
        subject_code: subject.subject_code,
        credits: subject.credits,
        total_marks_obtained: totalMarksObtained,
        total_max_marks: totalMaxMarks,
        percentage: parseFloat(percentage.toFixed(2)),
        weighted_percentage: parseFloat(weightedPercentage.toFixed(2)),
        grade: subjectGrade,
        gpa: averageGpa ? parseFloat(averageGpa.toFixed(2)) : null,
        is_passed: isPassed,
        assessment_count: grades.length,
        assessments: grades
      };
    });
  }

  /**
   * Calculate overall performance across all subjects
   */
  calculateOverallPerformance(subjectPerformance) {
    // Calculate total marks
    const totalMarksObtained = subjectPerformance.reduce((sum, s) => sum + s.total_marks_obtained, 0);
    const totalMaxMarks = subjectPerformance.reduce((sum, s) => sum + s.total_max_marks, 0);
    const overallPercentage = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;

    // Calculate credit-weighted GPA
    const totalCredits = subjectPerformance.reduce((sum, s) => sum + (s.credits || 1), 0);
    const weightedGpaSum = subjectPerformance.reduce((sum, s) => {
      return sum + ((s.gpa || 0) * (s.credits || 1));
    }, 0);
    const overallGpa = totalCredits > 0 ? weightedGpaSum / totalCredits : null;

    // Determine overall grade
    const overallGrade = this.determineGrade(overallPercentage);

    return {
      total_marks_obtained: totalMarksObtained,
      total_max_marks: totalMaxMarks,
      overall_percentage: parseFloat(overallPercentage.toFixed(2)),
      overall_grade: overallGrade,
      overall_gpa: overallGpa ? parseFloat(overallGpa.toFixed(2)) : null
    };
  }

  /**
   * Determine grade based on percentage
   * Using CBSE grading scale as default
   */
  determineGrade(percentage) {
    if (percentage >= 91) return 'A1';
    if (percentage >= 81) return 'A2';
    if (percentage >= 71) return 'B1';
    if (percentage >= 61) return 'B2';
    if (percentage >= 51) return 'C1';
    if (percentage >= 41) return 'C2';
    if (percentage >= 33) return 'D';
    return 'E';
  }

  /**
   * Calculate class rank for student
   */
  async calculateClassRank(client, studentId, className, academicYear, term, studentPercentage) {
    // Get all report cards for this class/term to calculate rank
    const query = `
      SELECT student_id, overall_percentage
      FROM academic.report_cards
      WHERE class = $1
        AND academic_year = $2
        AND term = $3
        AND is_deleted = false
        AND status != 'Draft'
      ORDER BY overall_percentage DESC
    `;

    const result = await client.query(query, [className, academicYear, term]);

    // Add current student if not in results (for draft report)
    const allStudents = [...result.rows];
    if (!allStudents.find(s => s.student_id === studentId)) {
      allStudents.push({ student_id: studentId, overall_percentage: studentPercentage });
    }

    // Sort by percentage descending
    allStudents.sort((a, b) => b.overall_percentage - a.overall_percentage);

    // Find rank (handle ties by giving same rank)
    let rank = 1;
    let previousPercentage = null;
    let currentRank = 1;

    for (let i = 0; i < allStudents.length; i++) {
      if (previousPercentage !== null && allStudents[i].overall_percentage < previousPercentage) {
        rank = i + 1;
      }

      if (allStudents[i].student_id === studentId) {
        currentRank = rank;
        break;
      }

      previousPercentage = allStudents[i].overall_percentage;
    }

    return {
      rank: currentRank,
      total: allStudents.length
    };
  }

  /**
   * Get report card by ID
   */
  async getReportCardById(reportId) {
    const query = `
      SELECT * FROM academic.report_cards
      WHERE report_id = $1 AND is_deleted = false
    `;

    const result = await db.query(query, [reportId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Report card not found');
    }

    return result.rows[0];
  }

  /**
   * Update report card
   */
  async updateReportCard(reportId, updates, userId) {
    await this.getReportCardById(reportId);

    const allowedFields = ['teacher_remarks', 'principal_remarks', 'status'];
    const updateFields = [];
    const params = [reportId];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        paramCount++;
        updateFields.push(`${key} = $${paramCount}`);
        params.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    paramCount++;
    updateFields.push(`updated_by = $${paramCount}`);
    params.push(userId);

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE academic.report_cards
      SET ${updateFields.join(', ')}
      WHERE report_id = $1 AND is_deleted = false
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Publish report card
   */
  async publishReportCard(reportId, publishData, userId) {
    const reportCard = await this.getReportCardById(reportId);

    if (reportCard.status === 'Published') {
      throw new ValidationError('Report card is already published');
    }

    const updates = {
      status: 'Published',
      published_date: new Date(),
      teacher_remarks: publishData.teacher_remarks || reportCard.teacher_remarks,
      principal_remarks: publishData.principal_remarks || reportCard.principal_remarks
    };

    const query = `
      UPDATE academic.report_cards
      SET status = $2,
          published_date = $3,
          teacher_remarks = $4,
          principal_remarks = $5,
          updated_by = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE report_id = $1 AND is_deleted = false
      RETURNING *
    `;

    const result = await db.query(query, [
      reportId,
      updates.status,
      updates.published_date,
      updates.teacher_remarks,
      updates.principal_remarks,
      userId
    ]);

    // TODO: Send notification to parents if publishData.notify_parents is true
    // This would integrate with notification service

    return result.rows[0];
  }

  /**
   * Delete report card (soft delete)
   */
  async deleteReportCard(reportId, userId) {
    const reportCard = await this.getReportCardById(reportId);

    if (reportCard.status === 'Published') {
      throw new ValidationError('Cannot delete published report card. Unpublish it first.');
    }

    const query = `
      UPDATE academic.report_cards
      SET is_deleted = true, updated_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE report_id = $1
    `;

    await db.query(query, [reportId, userId]);

    return { message: 'Report card deleted successfully' };
  }

  /**
   * List report cards with filters
   */
  async listReportCards(filters) {
    const {
      school_id,
      student_id,
      class: className,
      academic_year,
      term,
      status,
      page = 1,
      limit = 20
    } = filters;

    const offset = (page - 1) * limit;
    const conditions = ['is_deleted = false', 'school_id = $1'];
    const params = [school_id];
    let paramCount = 1;

    if (student_id) {
      paramCount++;
      conditions.push(`student_id = $${paramCount}`);
      params.push(student_id);
    }

    if (className) {
      paramCount++;
      conditions.push(`class = $${paramCount}`);
      params.push(className);
    }

    if (academic_year) {
      paramCount++;
      conditions.push(`academic_year = $${paramCount}`);
      params.push(academic_year);
    }

    if (term) {
      paramCount++;
      conditions.push(`term = $${paramCount}`);
      params.push(term);
    }

    if (status) {
      paramCount++;
      conditions.push(`status = $${paramCount}`);
      params.push(status);
    }

    const countQuery = `
      SELECT COUNT(*) FROM academic.report_cards
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await db.query(countQuery, params);
    const totalRecords = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT * FROM academic.report_cards
      WHERE ${conditions.join(' AND ')}
      ORDER BY academic_year DESC, term DESC, created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await db.query(dataQuery, params);

    return {
      report_cards: result.rows,
      pagination: {
        total: totalRecords,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalRecords / limit)
      }
    };
  }

  /**
   * Get student's report cards
   */
  async getStudentReportCards(filters) {
    const { student_id, academic_year, term } = filters;

    const conditions = ['is_deleted = false', 'student_id = $1'];
    const params = [student_id];
    let paramCount = 1;

    if (academic_year) {
      paramCount++;
      conditions.push(`academic_year = $${paramCount}`);
      params.push(academic_year);
    }

    if (term) {
      paramCount++;
      conditions.push(`term = $${paramCount}`);
      params.push(term);
    }

    const query = `
      SELECT * FROM academic.report_cards
      WHERE ${conditions.join(' AND ')}
      ORDER BY academic_year DESC, term DESC
    `;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Bulk generate report cards for a class
   */
  async bulkGenerateReportCards(bulkData, userId) {
    const { school_id, class: className, section, academic_year, term, student_ids, calculate_rank } = bulkData;

    const client = await db.pool.connect();
    const results = [];
    const errors = [];

    try {
      // Get all students in the class if not specified
      let targetStudents = student_ids;

      if (!targetStudents || targetStudents.length === 0) {
        const studentsQuery = `
          SELECT student_id
          FROM sis_core.students
          WHERE school_id = $1
            AND current_class = $2
            ${section ? 'AND current_section = $3' : ''}
            AND is_deleted = false
        `;
        const studentsParams = section ? [school_id, className, section] : [school_id, className];
        const studentsResult = await client.query(studentsQuery, studentsParams);
        targetStudents = studentsResult.rows.map(r => r.student_id);
      }

      // Generate report card for each student
      for (const studentId of targetStudents) {
        try {
          const reportCard = await this.generateReportCard({
            student_id: studentId,
            school_id,
            class: className,
            academic_year,
            term,
            calculate_rank
          }, userId);

          results.push({
            student_id: studentId,
            report_id: reportCard.report_id,
            status: 'success'
          });
        } catch (error) {
          errors.push({
            student_id: studentId,
            error: error.message,
            status: 'failed'
          });
        }
      }

      return {
        message: `Generated ${results.length} report cards, ${errors.length} failed`,
        success_count: results.length,
        error_count: errors.length,
        results,
        errors
      };
    } finally {
      client.release();
    }
  }
}

module.exports = new ReportCardService();
