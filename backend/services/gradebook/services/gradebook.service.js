const db = require('../../../shared/config/database');
const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ConflictError, ValidationError } = require('../../../shared/utils/errors');

/**
 * Grade Book Service
 * Handles assessments, grade recording, report card generation, and analytics
 */

class GradeBookService {
  /**
   * Grade calculation based on different grading scales
   */
  calculateGrade(marksObtained, totalMarks, gradingScale = 'Percentage') {
    const percentage = (marksObtained / totalMarks) * 100;

    const gradeMapping = {
      CBSE: [
        { min: 91, max: 100, grade: 'A1', gpa: 10.0 },
        { min: 81, max: 90, grade: 'A2', gpa: 9.0 },
        { min: 71, max: 80, grade: 'B1', gpa: 8.0 },
        { min: 61, max: 70, grade: 'B2', gpa: 7.0 },
        { min: 51, max: 60, grade: 'C1', gpa: 6.0 },
        { min: 41, max: 50, grade: 'C2', gpa: 5.0 },
        { min: 33, max: 40, grade: 'D', gpa: 4.0 },
        { min: 0, max: 32, grade: 'E', gpa: 0.0 }
      ],
      ICSE: percentage, // Direct percentage
      Cambridge: [
        { min: 90, max: 100, grade: 'A*', gpa: 4.0 },
        { min: 80, max: 89, grade: 'A', gpa: 3.7 },
        { min: 70, max: 79, grade: 'B', gpa: 3.3 },
        { min: 60, max: 69, grade: 'C', gpa: 3.0 },
        { min: 50, max: 59, grade: 'D', gpa: 2.7 },
        { min: 40, max: 49, grade: 'E', gpa: 2.3 },
        { min: 0, max: 39, grade: 'F', gpa: 0.0 }
      ],
      IB: [
        { min: 90, max: 100, grade: '7', gpa: 7.0 },
        { min: 80, max: 89, grade: '6', gpa: 6.0 },
        { min: 70, max: 79, grade: '5', gpa: 5.0 },
        { min: 60, max: 69, grade: '4', gpa: 4.0 },
        { min: 50, max: 59, grade: '3', gpa: 3.0 },
        { min: 40, max: 49, grade: '2', gpa: 2.0 },
        { min: 0, max: 39, grade: '1', gpa: 1.0 }
      ],
      Percentage: percentage
    };

    if (gradingScale === 'Percentage' || gradingScale === 'ICSE') {
      return {
        percentage: percentage.toFixed(2),
        grade: percentage >= 33 ? 'Pass' : 'Fail',
        gpa: null
      };
    }

    const scale = gradeMapping[gradingScale];
    const gradeInfo = scale.find(g => percentage >= g.min && percentage <= g.max);

    return {
      percentage: percentage.toFixed(2),
      grade: gradeInfo ? gradeInfo.grade : 'N/A',
      gpa: gradeInfo ? gradeInfo.gpa : null
    };
  }

  /**
   * Create assessment
   */
  async createAssessment(assessmentData, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify subject exists
      const subjectCheck = await client.query(
        'SELECT subject_id FROM academic.subjects WHERE subject_id = $1 AND is_deleted = false',
        [assessmentData.subject_id]
      );

      if (subjectCheck.rows.length === 0) {
        throw new NotFoundError('Subject not found');
      }

      const assessmentId = uuidv4();
      const passingMarks = assessmentData.passing_marks || (assessmentData.total_marks * 0.33);

      const insertQuery = `
        INSERT INTO academic.assessments (
          assessment_id, school_id, subject_id, assessment_type,
          assessment_name, class, section, total_marks, passing_marks,
          weightage, scheduled_date, duration_minutes, instructions,
          grading_scale, status, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        assessmentId,
        assessmentData.school_id,
        assessmentData.subject_id,
        assessmentData.assessment_type,
        assessmentData.assessment_name,
        assessmentData.class,
        assessmentData.section || null,
        assessmentData.total_marks,
        passingMarks,
        assessmentData.weightage || 0,
        assessmentData.scheduled_date,
        assessmentData.duration_minutes || null,
        assessmentData.instructions || null,
        assessmentData.grading_scale || 'Percentage',
        assessmentData.status || 'Scheduled',
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
   * Get assessment by ID
   */
  async getAssessmentById(assessmentId) {
    const query = `
      SELECT a.*, s.subject_name, s.subject_code
      FROM academic.assessments a
      JOIN academic.subjects s ON a.subject_id = s.subject_id
      WHERE a.assessment_id = $1 AND a.is_deleted = false
    `;

    const result = await db.query(query, [assessmentId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Assessment not found');
    }

    return result.rows[0];
  }

  /**
   * List assessments with filters
   */
  async listAssessments(filters) {
    const {
      school_id,
      subject_id,
      class: className,
      section,
      assessment_type,
      status,
      from_date,
      to_date,
      page = 1,
      limit = 20
    } = filters;

    const offset = (page - 1) * limit;
    const conditions = ['a.is_deleted = false', 'a.school_id = $1'];
    const params = [school_id];
    let paramCount = 1;

    if (subject_id) {
      paramCount++;
      conditions.push(`a.subject_id = $${paramCount}`);
      params.push(subject_id);
    }

    if (className) {
      paramCount++;
      conditions.push(`a.class = $${paramCount}`);
      params.push(className);
    }

    if (section) {
      paramCount++;
      conditions.push(`a.section = $${paramCount}`);
      params.push(section);
    }

    if (assessment_type) {
      paramCount++;
      conditions.push(`a.assessment_type = $${paramCount}`);
      params.push(assessment_type);
    }

    if (status) {
      paramCount++;
      conditions.push(`a.status = $${paramCount}`);
      params.push(status);
    }

    if (from_date) {
      paramCount++;
      conditions.push(`a.scheduled_date >= $${paramCount}`);
      params.push(from_date);
    }

    if (to_date) {
      paramCount++;
      conditions.push(`a.scheduled_date <= $${paramCount}`);
      params.push(to_date);
    }

    const countQuery = `
      SELECT COUNT(*) FROM academic.assessments a
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await db.query(countQuery, params);
    const totalRecords = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT a.*, s.subject_name, s.subject_code
      FROM academic.assessments a
      JOIN academic.subjects s ON a.subject_id = s.subject_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.scheduled_date DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await db.query(dataQuery, params);

    return {
      assessments: result.rows,
      pagination: {
        total: totalRecords,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalRecords / limit)
      }
    };
  }

  /**
   * Update assessment
   */
  async updateAssessment(assessmentId, updates, userId) {
    await this.getAssessmentById(assessmentId);

    const allowedFields = [
      'assessment_type',
      'assessment_name',
      'total_marks',
      'passing_marks',
      'weightage',
      'scheduled_date',
      'duration_minutes',
      'instructions',
      'grading_scale',
      'status'
    ];

    const updateFields = [];
    const params = [assessmentId];
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
      UPDATE academic.assessments
      SET ${updateFields.join(', ')}
      WHERE assessment_id = $1 AND is_deleted = false
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Record single grade
   */
  async recordGrade(gradeData, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify assessment exists
      const assessment = await this.getAssessmentById(gradeData.assessment_id);

      // Validate marks don't exceed total marks
      if (gradeData.marks_obtained > assessment.total_marks) {
        throw new ValidationError(
          `Marks obtained (${gradeData.marks_obtained}) cannot exceed total marks (${assessment.total_marks})`
        );
      }

      // Check if grade already exists
      const existingGrade = await client.query(
        `SELECT grade_id FROM academic.student_grades
         WHERE assessment_id = $1 AND student_id = $2 AND is_deleted = false`,
        [gradeData.assessment_id, gradeData.student_id]
      );

      if (existingGrade.rows.length > 0) {
        throw new ConflictError('Grade already recorded for this student. Use update instead.');
      }

      // Calculate grade
      const gradeInfo = this.calculateGrade(
        gradeData.marks_obtained,
        assessment.total_marks,
        assessment.grading_scale
      );

      const gradeId = uuidv4();
      const isPassed = gradeData.marks_obtained >= assessment.passing_marks;

      const insertQuery = `
        INSERT INTO academic.student_grades (
          grade_id, assessment_id, student_id, marks_obtained,
          percentage, grade, gpa, is_passed, is_absent, remarks,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        gradeId,
        gradeData.assessment_id,
        gradeData.student_id,
        gradeData.is_absent ? null : gradeData.marks_obtained,
        gradeData.is_absent ? null : gradeInfo.percentage,
        gradeData.is_absent ? 'AB' : gradeInfo.grade,
        gradeData.is_absent ? null : gradeInfo.gpa,
        gradeData.is_absent ? false : isPassed,
        gradeData.is_absent || false,
        gradeData.remarks || null,
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
   * Record grades in batch
   */
  async recordBatchGrades(batchData, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const assessment = await this.getAssessmentById(batchData.assessment_id);
      const results = [];

      for (const gradeData of batchData.grades) {
        // Validate marks
        if (gradeData.marks_obtained > assessment.total_marks) {
          throw new ValidationError(
            `Marks ${gradeData.marks_obtained} exceed total marks ${assessment.total_marks} for student ${gradeData.student_id}`
          );
        }

        // Calculate grade
        const gradeInfo = this.calculateGrade(
          gradeData.marks_obtained,
          assessment.total_marks,
          assessment.grading_scale
        );

        const gradeId = uuidv4();
        const isPassed = gradeData.marks_obtained >= assessment.passing_marks;

        const insertQuery = `
          INSERT INTO academic.student_grades (
            grade_id, assessment_id, student_id, marks_obtained,
            percentage, grade, gpa, is_passed, is_absent, remarks,
            created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (assessment_id, student_id)
          DO UPDATE SET
            marks_obtained = EXCLUDED.marks_obtained,
            percentage = EXCLUDED.percentage,
            grade = EXCLUDED.grade,
            gpa = EXCLUDED.gpa,
            is_passed = EXCLUDED.is_passed,
            is_absent = EXCLUDED.is_absent,
            remarks = EXCLUDED.remarks,
            updated_by = EXCLUDED.updated_by,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;

        const result = await client.query(insertQuery, [
          gradeId,
          batchData.assessment_id,
          gradeData.student_id,
          gradeData.is_absent ? null : gradeData.marks_obtained,
          gradeData.is_absent ? null : gradeInfo.percentage,
          gradeData.is_absent ? 'AB' : gradeInfo.grade,
          gradeData.is_absent ? null : gradeInfo.gpa,
          gradeData.is_absent ? false : isPassed,
          gradeData.is_absent || false,
          gradeData.remarks || null,
          userId,
          userId
        ]);

        results.push(result.rows[0]);
      }

      await client.query('COMMIT');

      return {
        message: `Successfully recorded ${results.length} grades`,
        grades: results
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get student grades
   */
  async getStudentGrades(filters) {
    const { student_id, subject_id, assessment_type, from_date, to_date } = filters;

    const conditions = ['sg.is_deleted = false', 'sg.student_id = $1'];
    const params = [student_id];
    let paramCount = 1;

    if (subject_id) {
      paramCount++;
      conditions.push(`a.subject_id = $${paramCount}`);
      params.push(subject_id);
    }

    if (assessment_type) {
      paramCount++;
      conditions.push(`a.assessment_type = $${paramCount}`);
      params.push(assessment_type);
    }

    if (from_date) {
      paramCount++;
      conditions.push(`a.scheduled_date >= $${paramCount}`);
      params.push(from_date);
    }

    if (to_date) {
      paramCount++;
      conditions.push(`a.scheduled_date <= $${paramCount}`);
      params.push(to_date);
    }

    const query = `
      SELECT sg.*, a.assessment_name, a.assessment_type, a.total_marks,
             a.scheduled_date, s.subject_name, s.subject_code
      FROM academic.student_grades sg
      JOIN academic.assessments a ON sg.assessment_id = a.assessment_id
      JOIN academic.subjects s ON a.subject_id = s.subject_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.scheduled_date DESC
    `;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Update grade
   */
  async updateGrade(gradeId, updates, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Get existing grade
      const existingGrade = await client.query(
        `SELECT sg.*, a.total_marks, a.passing_marks, a.grading_scale
         FROM academic.student_grades sg
         JOIN academic.assessments a ON sg.assessment_id = a.assessment_id
         WHERE sg.grade_id = $1 AND sg.is_deleted = false`,
        [gradeId]
      );

      if (existingGrade.rows.length === 0) {
        throw new NotFoundError('Grade not found');
      }

      const grade = existingGrade.rows[0];

      // Recalculate grade if marks changed
      let gradeInfo = {
        percentage: grade.percentage,
        grade: grade.grade,
        gpa: grade.gpa
      };

      const marksObtained = updates.marks_obtained !== undefined
        ? updates.marks_obtained
        : grade.marks_obtained;

      if (updates.marks_obtained !== undefined) {
        if (updates.marks_obtained > grade.total_marks) {
          throw new ValidationError(
            `Marks obtained cannot exceed total marks (${grade.total_marks})`
          );
        }

        gradeInfo = this.calculateGrade(
          updates.marks_obtained,
          grade.total_marks,
          grade.grading_scale
        );
      }

      const isPassed = marksObtained >= grade.passing_marks;
      const isAbsent = updates.is_absent !== undefined ? updates.is_absent : grade.is_absent;

      const updateQuery = `
        UPDATE academic.student_grades
        SET marks_obtained = $2,
            percentage = $3,
            grade = $4,
            gpa = $5,
            is_passed = $6,
            is_absent = $7,
            remarks = $8,
            updated_by = $9,
            updated_at = CURRENT_TIMESTAMP
        WHERE grade_id = $1
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        gradeId,
        isAbsent ? null : marksObtained,
        isAbsent ? null : gradeInfo.percentage,
        isAbsent ? 'AB' : gradeInfo.grade,
        isAbsent ? null : gradeInfo.gpa,
        isAbsent ? false : isPassed,
        isAbsent,
        updates.remarks !== undefined ? updates.remarks : grade.remarks,
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
   * Get class performance for an assessment
   */
  async getClassPerformance(filters) {
    const { school_id, class: className, section, subject_id, assessment_id } = filters;

    let query, params;

    if (assessment_id) {
      query = `
        SELECT
          COUNT(*) as total_students,
          COUNT(*) FILTER (WHERE is_passed = true) as passed,
          COUNT(*) FILTER (WHERE is_passed = false AND is_absent = false) as failed,
          COUNT(*) FILTER (WHERE is_absent = true) as absent,
          ROUND(AVG(percentage) FILTER (WHERE is_absent = false), 2) as average_percentage,
          MAX(marks_obtained) as highest_marks,
          MIN(marks_obtained) FILTER (WHERE is_absent = false) as lowest_marks
        FROM academic.student_grades
        WHERE assessment_id = $1 AND is_deleted = false
      `;
      params = [assessment_id];
    } else {
      const conditions = ['a.school_id = $1', 'a.class = $2'];
      params = [school_id, className];
      let paramCount = 2;

      if (section) {
        paramCount++;
        conditions.push(`a.section = $${paramCount}`);
        params.push(section);
      }

      if (subject_id) {
        paramCount++;
        conditions.push(`a.subject_id = $${paramCount}`);
        params.push(subject_id);
      }

      query = `
        SELECT
          COUNT(DISTINCT sg.student_id) as total_students,
          COUNT(*) FILTER (WHERE sg.is_passed = true) as total_passed,
          COUNT(*) FILTER (WHERE sg.is_passed = false AND sg.is_absent = false) as total_failed,
          COUNT(*) FILTER (WHERE sg.is_absent = true) as total_absent,
          ROUND(AVG(sg.percentage) FILTER (WHERE sg.is_absent = false), 2) as average_percentage
        FROM academic.student_grades sg
        JOIN academic.assessments a ON sg.assessment_id = a.assessment_id
        WHERE ${conditions.join(' AND ')} AND sg.is_deleted = false
      `;
    }

    const result = await db.query(query, params);
    return result.rows[0];
  }
}

module.exports = new GradeBookService();
