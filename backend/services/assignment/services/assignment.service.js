const db = require('../../../shared/config/database');
const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ConflictError, ValidationError } = require('../../../shared/utils/errors');

/**
 * Assignment Management Service
 * Handles assignment creation, submission tracking, and grading
 */

class AssignmentService {
  /**
   * Create assignment
   */
  async createAssignment(assignmentData, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify subject exists
      const subjectCheck = await client.query(
        'SELECT subject_id FROM academic.subjects WHERE subject_id = $1 AND is_deleted = false',
        [assignmentData.subject_id]
      );

      if (subjectCheck.rows.length === 0) {
        throw new NotFoundError('Subject not found');
      }

      const assignmentId = uuidv4();

      const insertQuery = `
        INSERT INTO academic.assignments (
          assignment_id, school_id, subject_id, teacher_id,
          assignment_type, assignment_title, description, class, section,
          assigned_date, due_date, max_marks, instructions, attachments,
          allow_late_submission, late_penalty_percentage, status,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        assignmentId,
        assignmentData.school_id,
        assignmentData.subject_id,
        assignmentData.teacher_id,
        assignmentData.assignment_type,
        assignmentData.assignment_title,
        assignmentData.description,
        assignmentData.class,
        assignmentData.section || null,
        assignmentData.assigned_date,
        assignmentData.due_date,
        assignmentData.max_marks,
        assignmentData.instructions || null,
        assignmentData.attachments ? JSON.stringify(assignmentData.attachments) : null,
        assignmentData.allow_late_submission !== undefined ? assignmentData.allow_late_submission : false,
        assignmentData.late_penalty_percentage || 0,
        assignmentData.status || 'Draft',
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
   * Get assignment by ID
   */
  async getAssignmentById(assignmentId, includeSubmissions = false) {
    const query = `
      SELECT a.*, s.subject_name, s.subject_code
      FROM academic.assignments a
      JOIN academic.subjects s ON a.subject_id = s.subject_id
      WHERE a.assignment_id = $1 AND a.is_deleted = false
    `;

    const result = await db.query(query, [assignmentId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Assignment not found');
    }

    const assignment = result.rows[0];

    if (includeSubmissions) {
      const submissionsQuery = `
        SELECT * FROM academic.assignment_submissions
        WHERE assignment_id = $1 AND is_deleted = false
        ORDER BY submission_date DESC
      `;
      const submissionsResult = await db.query(submissionsQuery, [assignmentId]);
      assignment.submissions = submissionsResult.rows;
    }

    return assignment;
  }

  /**
   * List assignments with filters
   */
  async listAssignments(filters) {
    const {
      school_id,
      subject_id,
      teacher_id,
      class: className,
      section,
      assignment_type,
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

    if (teacher_id) {
      paramCount++;
      conditions.push(`a.teacher_id = $${paramCount}`);
      params.push(teacher_id);
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

    if (assignment_type) {
      paramCount++;
      conditions.push(`a.assignment_type = $${paramCount}`);
      params.push(assignment_type);
    }

    if (status) {
      paramCount++;
      conditions.push(`a.status = $${paramCount}`);
      params.push(status);
    }

    if (from_date) {
      paramCount++;
      conditions.push(`a.assigned_date >= $${paramCount}`);
      params.push(from_date);
    }

    if (to_date) {
      paramCount++;
      conditions.push(`a.due_date <= $${paramCount}`);
      params.push(to_date);
    }

    const countQuery = `
      SELECT COUNT(*) FROM academic.assignments a
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await db.query(countQuery, params);
    const totalRecords = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT a.*, s.subject_name, s.subject_code
      FROM academic.assignments a
      JOIN academic.subjects s ON a.subject_id = s.subject_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.due_date DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await db.query(dataQuery, params);

    return {
      assignments: result.rows,
      pagination: {
        total: totalRecords,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalRecords / limit)
      }
    };
  }

  /**
   * Update assignment
   */
  async updateAssignment(assignmentId, updates, userId) {
    await this.getAssignmentById(assignmentId);

    const allowedFields = [
      'assignment_type',
      'assignment_title',
      'description',
      'assigned_date',
      'due_date',
      'max_marks',
      'instructions',
      'attachments',
      'allow_late_submission',
      'late_penalty_percentage',
      'status'
    ];

    const updateFields = [];
    const params = [assignmentId];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        paramCount++;
        if (key === 'attachments') {
          updateFields.push(`${key} = $${paramCount}::jsonb`);
          params.push(JSON.stringify(updates[key]));
        } else {
          updateFields.push(`${key} = $${paramCount}`);
          params.push(updates[key]);
        }
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
      UPDATE academic.assignments
      SET ${updateFields.join(', ')}
      WHERE assignment_id = $1 AND is_deleted = false
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Delete assignment (soft delete)
   */
  async deleteAssignment(assignmentId, userId) {
    await this.getAssignmentById(assignmentId);

    // Check if assignment has submissions
    const submissionsCheck = await db.query(
      `SELECT COUNT(*) FROM academic.assignment_submissions
       WHERE assignment_id = $1 AND is_deleted = false`,
      [assignmentId]
    );

    if (parseInt(submissionsCheck.rows[0].count) > 0) {
      throw new ConflictError('Cannot delete assignment with existing submissions. Archive it instead.');
    }

    const query = `
      UPDATE academic.assignments
      SET is_deleted = true, updated_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE assignment_id = $1
    `;

    await db.query(query, [assignmentId, userId]);

    return { message: 'Assignment deleted successfully' };
  }

  /**
   * Submit assignment
   */
  async submitAssignment(submissionData, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify assignment exists and get details
      const assignment = await this.getAssignmentById(submissionData.assignment_id);

      // Check if assignment is published
      if (assignment.status !== 'Published') {
        throw new ValidationError('Cannot submit to unpublished assignment');
      }

      // Check if already submitted
      const existingSubmission = await client.query(
        `SELECT submission_id FROM academic.assignment_submissions
         WHERE assignment_id = $1 AND student_id = $2 AND is_deleted = false`,
        [submissionData.assignment_id, submissionData.student_id]
      );

      if (existingSubmission.rows.length > 0) {
        throw new ConflictError('Assignment already submitted. Use update instead.');
      }

      // Check if late
      const submissionDate = new Date();
      const dueDate = new Date(assignment.due_date);
      const isLate = submissionDate > dueDate;

      if (isLate && !assignment.allow_late_submission) {
        throw new ValidationError('Late submissions are not allowed for this assignment');
      }

      const submissionId = uuidv4();
      const status = isLate ? 'Late' : 'Submitted';

      const insertQuery = `
        INSERT INTO academic.assignment_submissions (
          submission_id, assignment_id, student_id, submission_date,
          submission_content, attachments, is_late, status, remarks,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        submissionId,
        submissionData.assignment_id,
        submissionData.student_id,
        submissionDate,
        submissionData.submission_content || null,
        JSON.stringify(submissionData.attachments),
        isLate,
        status,
        submissionData.remarks || null,
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
   * Get assignment submissions
   */
  async getSubmissions(filters) {
    const { assignment_id, status, student_id } = filters;

    const conditions = ['is_deleted = false', 'assignment_id = $1'];
    const params = [assignment_id];
    let paramCount = 1;

    if (status) {
      paramCount++;
      conditions.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (student_id) {
      paramCount++;
      conditions.push(`student_id = $${paramCount}`);
      params.push(student_id);
    }

    const query = `
      SELECT * FROM academic.assignment_submissions
      WHERE ${conditions.join(' AND ')}
      ORDER BY submission_date DESC
    `;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get submission by ID
   */
  async getSubmissionById(submissionId) {
    const query = `
      SELECT sub.*, a.assignment_title, a.max_marks, a.late_penalty_percentage,
             s.subject_name, s.subject_code
      FROM academic.assignment_submissions sub
      JOIN academic.assignments a ON sub.assignment_id = a.assignment_id
      JOIN academic.subjects s ON a.subject_id = s.subject_id
      WHERE sub.submission_id = $1 AND sub.is_deleted = false
    `;

    const result = await db.query(query, [submissionId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Submission not found');
    }

    return result.rows[0];
  }

  /**
   * Grade submission
   */
  async gradeSubmission(submissionId, gradeData, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const submission = await this.getSubmissionById(submissionId);

      // Validate marks
      if (gradeData.marks_obtained > submission.max_marks) {
        throw new ValidationError(
          `Marks obtained (${gradeData.marks_obtained}) cannot exceed maximum marks (${submission.max_marks})`
        );
      }

      // Apply late penalty if applicable
      let finalMarks = gradeData.marks_obtained;
      if (submission.is_late && submission.late_penalty_percentage > 0) {
        const penalty = (gradeData.marks_obtained * submission.late_penalty_percentage) / 100;
        finalMarks = Math.max(0, gradeData.marks_obtained - penalty);
      }

      const updateQuery = `
        UPDATE academic.assignment_submissions
        SET marks_obtained = $2,
            final_marks = $3,
            feedback = $4,
            graded_date = $5,
            graded_by = $6,
            status = 'Graded',
            updated_by = $7,
            updated_at = CURRENT_TIMESTAMP
        WHERE submission_id = $1
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        submissionId,
        gradeData.marks_obtained,
        finalMarks,
        gradeData.feedback || null,
        gradeData.graded_date || new Date(),
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
   * Get student's assignments (with submission status)
   */
  async getMyAssignments(filters) {
    const {
      student_id,
      subject_id,
      status,
      from_date,
      to_date,
      page = 1,
      limit = 20
    } = filters;

    const offset = (page - 1) * limit;
    const conditions = ['a.is_deleted = false', 'a.status = \'Published\''];
    const params = [];
    let paramCount = 0;

    if (subject_id) {
      paramCount++;
      conditions.push(`a.subject_id = $${paramCount}`);
      params.push(subject_id);
    }

    if (from_date) {
      paramCount++;
      conditions.push(`a.assigned_date >= $${paramCount}`);
      params.push(from_date);
    }

    if (to_date) {
      paramCount++;
      conditions.push(`a.due_date <= $${paramCount}`);
      params.push(to_date);
    }

    // Filter by submission status
    if (status === 'pending') {
      paramCount++;
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM academic.assignment_submissions sub
        WHERE sub.assignment_id = a.assignment_id
        AND sub.student_id = $${paramCount}
        AND sub.is_deleted = false
      )`);
      params.push(student_id);
    } else if (status === 'submitted') {
      paramCount++;
      conditions.push(`EXISTS (
        SELECT 1 FROM academic.assignment_submissions sub
        WHERE sub.assignment_id = a.assignment_id
        AND sub.student_id = $${paramCount}
        AND sub.status IN ('Submitted', 'Late')
        AND sub.is_deleted = false
      )`);
      params.push(student_id);
    } else if (status === 'graded') {
      paramCount++;
      conditions.push(`EXISTS (
        SELECT 1 FROM academic.assignment_submissions sub
        WHERE sub.assignment_id = a.assignment_id
        AND sub.student_id = $${paramCount}
        AND sub.status = 'Graded'
        AND sub.is_deleted = false
      )`);
      params.push(student_id);
    }

    const countQuery = `
      SELECT COUNT(*) FROM academic.assignments a
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await db.query(countQuery, params);
    const totalRecords = parseInt(countResult.rows[0].count);

    paramCount++;
    const studentIdParam = `$${paramCount}`;
    params.push(student_id);

    const dataQuery = `
      SELECT a.*, s.subject_name, s.subject_code,
             sub.submission_id, sub.submission_date, sub.status as submission_status,
             sub.marks_obtained, sub.final_marks, sub.feedback
      FROM academic.assignments a
      JOIN academic.subjects s ON a.subject_id = s.subject_id
      LEFT JOIN academic.assignment_submissions sub ON a.assignment_id = sub.assignment_id
        AND sub.student_id = ${studentIdParam} AND sub.is_deleted = false
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.due_date DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await db.query(dataQuery, params);

    return {
      assignments: result.rows,
      pagination: {
        total: totalRecords,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalRecords / limit)
      }
    };
  }

  /**
   * Get assignment analytics
   */
  async getAssignmentAnalytics(assignmentId) {
    const query = `
      SELECT
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE status = 'Graded') as graded,
        COUNT(*) FILTER (WHERE status IN ('Submitted', 'Late')) as pending_grading,
        COUNT(*) FILTER (WHERE is_late = true) as late_submissions,
        ROUND(AVG(final_marks) FILTER (WHERE status = 'Graded'), 2) as average_marks,
        MAX(final_marks) as highest_marks,
        MIN(final_marks) FILTER (WHERE status = 'Graded') as lowest_marks
      FROM academic.assignment_submissions
      WHERE assignment_id = $1 AND is_deleted = false
    `;

    const result = await db.query(query, [assignmentId]);
    return result.rows[0];
  }
}

module.exports = new AssignmentService();
