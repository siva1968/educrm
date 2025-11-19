const db = require('../../../shared/config/database');
const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ConflictError, ValidationError } = require('../../../shared/utils/errors');

/**
 * Examination Management Service
 * Handles exam scheduling, result processing, and analytics
 */

class ExaminationService {
  /**
   * Create examination
   */
  async createExamination(examData, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const examinationId = uuidv4();

      const insertQuery = `
        INSERT INTO academic.examinations (
          examination_id, school_id, exam_name, exam_type,
          academic_year, applicable_classes, start_date, end_date,
          instructions, status, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        examinationId,
        examData.school_id,
        examData.exam_name,
        examData.exam_type,
        examData.academic_year,
        JSON.stringify(examData.applicable_classes),
        examData.start_date,
        examData.end_date,
        examData.instructions || null,
        examData.status || 'Scheduled',
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
   * Get examination by ID
   */
  async getExaminationById(examinationId, includeSchedule = false) {
    const query = `
      SELECT * FROM academic.examinations
      WHERE examination_id = $1 AND is_deleted = false
    `;

    const result = await db.query(query, [examinationId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Examination not found');
    }

    const examination = result.rows[0];

    if (includeSchedule) {
      const scheduleQuery = `
        SELECT es.*, s.subject_name, s.subject_code
        FROM academic.exam_schedule es
        JOIN academic.subjects s ON es.subject_id = s.subject_id
        WHERE es.examination_id = $1 AND es.is_deleted = false
        ORDER BY es.exam_date, es.start_time
      `;
      const scheduleResult = await db.query(scheduleQuery, [examinationId]);
      examination.schedule = scheduleResult.rows;
    }

    return examination;
  }

  /**
   * List examinations with filters
   */
  async listExaminations(filters) {
    const {
      school_id,
      exam_type,
      academic_year,
      status,
      class: className,
      from_date,
      to_date,
      page = 1,
      limit = 20
    } = filters;

    const offset = (page - 1) * limit;
    const conditions = ['is_deleted = false', 'school_id = $1'];
    const params = [school_id];
    let paramCount = 1;

    if (exam_type) {
      paramCount++;
      conditions.push(`exam_type = $${paramCount}`);
      params.push(exam_type);
    }

    if (academic_year) {
      paramCount++;
      conditions.push(`academic_year = $${paramCount}`);
      params.push(academic_year);
    }

    if (status) {
      paramCount++;
      conditions.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (className) {
      paramCount++;
      conditions.push(`applicable_classes @> $${paramCount}::jsonb`);
      params.push(JSON.stringify([className]));
    }

    if (from_date) {
      paramCount++;
      conditions.push(`start_date >= $${paramCount}`);
      params.push(from_date);
    }

    if (to_date) {
      paramCount++;
      conditions.push(`end_date <= $${paramCount}`);
      params.push(to_date);
    }

    const countQuery = `
      SELECT COUNT(*) FROM academic.examinations
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await db.query(countQuery, params);
    const totalRecords = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT * FROM academic.examinations
      WHERE ${conditions.join(' AND ')}
      ORDER BY start_date DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await db.query(dataQuery, params);

    return {
      examinations: result.rows,
      pagination: {
        total: totalRecords,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalRecords / limit)
      }
    };
  }

  /**
   * Update examination
   */
  async updateExamination(examinationId, updates, userId) {
    await this.getExaminationById(examinationId);

    const allowedFields = [
      'exam_name',
      'exam_type',
      'start_date',
      'end_date',
      'instructions',
      'status'
    ];

    const updateFields = [];
    const params = [examinationId];
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
      UPDATE academic.examinations
      SET ${updateFields.join(', ')}
      WHERE examination_id = $1 AND is_deleted = false
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Add exam schedule (subject-wise timetable)
   */
  async addExamSchedule(scheduleData, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify examination exists
      await this.getExaminationById(scheduleData.examination_id);

      // Verify subject exists
      const subjectCheck = await client.query(
        'SELECT subject_id FROM academic.subjects WHERE subject_id = $1 AND is_deleted = false',
        [scheduleData.subject_id]
      );

      if (subjectCheck.rows.length === 0) {
        throw new NotFoundError('Subject not found');
      }

      // Check for conflicts (same subject already scheduled for this exam)
      const conflictCheck = await client.query(
        `SELECT schedule_id FROM academic.exam_schedule
         WHERE examination_id = $1 AND subject_id = $2 AND is_deleted = false`,
        [scheduleData.examination_id, scheduleData.subject_id]
      );

      if (conflictCheck.rows.length > 0) {
        throw new ConflictError('This subject is already scheduled for this examination');
      }

      const scheduleId = uuidv4();
      const passingMarks = scheduleData.passing_marks || (scheduleData.total_marks * 0.33);

      const insertQuery = `
        INSERT INTO academic.exam_schedule (
          schedule_id, examination_id, subject_id, exam_date,
          start_time, end_time, duration_minutes, total_marks,
          passing_marks, room_number, invigilator_ids, instructions,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        scheduleId,
        scheduleData.examination_id,
        scheduleData.subject_id,
        scheduleData.exam_date,
        scheduleData.start_time,
        scheduleData.end_time,
        scheduleData.duration_minutes,
        scheduleData.total_marks,
        passingMarks,
        scheduleData.room_number || null,
        scheduleData.invigilator_ids ? JSON.stringify(scheduleData.invigilator_ids) : null,
        scheduleData.instructions || null,
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
   * Get exam schedule (timetable)
   */
  async getExamSchedule(examinationId) {
    const query = `
      SELECT es.*, s.subject_name, s.subject_code
      FROM academic.exam_schedule es
      JOIN academic.subjects s ON es.subject_id = s.subject_id
      WHERE es.examination_id = $1 AND es.is_deleted = false
      ORDER BY es.exam_date, es.start_time
    `;

    const result = await db.query(query, [examinationId]);
    return result.rows;
  }

  /**
   * Update exam schedule
   */
  async updateExamSchedule(scheduleId, updates, userId) {
    const checkQuery = `
      SELECT schedule_id FROM academic.exam_schedule
      WHERE schedule_id = $1 AND is_deleted = false
    `;
    const checkResult = await db.query(checkQuery, [scheduleId]);

    if (checkResult.rows.length === 0) {
      throw new NotFoundError('Exam schedule not found');
    }

    const allowedFields = [
      'exam_date',
      'start_time',
      'end_time',
      'duration_minutes',
      'total_marks',
      'passing_marks',
      'room_number',
      'invigilator_ids',
      'instructions'
    ];

    const updateFields = [];
    const params = [scheduleId];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        paramCount++;
        if (key === 'invigilator_ids') {
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
      UPDATE academic.exam_schedule
      SET ${updateFields.join(', ')}
      WHERE schedule_id = $1 AND is_deleted = false
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Record exam result
   */
  async recordResult(resultData, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify exam schedule exists
      const scheduleQuery = `
        SELECT es.*, e.applicable_classes
        FROM academic.exam_schedule es
        JOIN academic.examinations e ON es.examination_id = e.examination_id
        WHERE es.schedule_id = $1 AND es.is_deleted = false
      `;
      const scheduleResult = await client.query(scheduleQuery, [resultData.exam_schedule_id]);

      if (scheduleResult.rows.length === 0) {
        throw new NotFoundError('Exam schedule not found');
      }

      const schedule = scheduleResult.rows[0];

      // Validate marks
      if (resultData.marks_obtained > schedule.total_marks) {
        throw new ValidationError(
          `Marks obtained (${resultData.marks_obtained}) cannot exceed total marks (${schedule.total_marks})`
        );
      }

      // Check if result already exists
      const existingResult = await client.query(
        `SELECT result_id FROM academic.exam_results
         WHERE exam_schedule_id = $1 AND student_id = $2 AND is_deleted = false`,
        [resultData.exam_schedule_id, resultData.student_id]
      );

      if (existingResult.rows.length > 0) {
        throw new ConflictError('Result already recorded for this student. Use update instead.');
      }

      const resultId = uuidv4();
      const percentage = resultData.is_absent ? null : (resultData.marks_obtained / schedule.total_marks) * 100;
      const isPassed = resultData.is_absent || resultData.is_expelled ? false : (resultData.marks_obtained >= schedule.passing_marks);

      const insertQuery = `
        INSERT INTO academic.exam_results (
          result_id, exam_schedule_id, student_id, marks_obtained,
          percentage, grade, is_passed, is_absent, is_expelled,
          remarks, status, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        resultId,
        resultData.exam_schedule_id,
        resultData.student_id,
        resultData.is_absent || resultData.is_expelled ? null : resultData.marks_obtained,
        percentage,
        resultData.grade || null,
        isPassed,
        resultData.is_absent || false,
        resultData.is_expelled || false,
        resultData.remarks || null,
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
   * Record results in batch
   */
  async recordBatchResults(batchData, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify exam schedule
      const scheduleQuery = `
        SELECT * FROM academic.exam_schedule
        WHERE schedule_id = $1 AND is_deleted = false
      `;
      const scheduleResult = await client.query(scheduleQuery, [batchData.exam_schedule_id]);

      if (scheduleResult.rows.length === 0) {
        throw new NotFoundError('Exam schedule not found');
      }

      const schedule = scheduleResult.rows[0];
      const results = [];

      for (const resultData of batchData.results) {
        // Validate marks
        if (resultData.marks_obtained > schedule.total_marks) {
          throw new ValidationError(
            `Marks ${resultData.marks_obtained} exceed total marks ${schedule.total_marks} for student ${resultData.student_id}`
          );
        }

        const resultId = uuidv4();
        const percentage = resultData.is_absent || resultData.is_expelled
          ? null
          : (resultData.marks_obtained / schedule.total_marks) * 100;
        const isPassed = resultData.is_absent || resultData.is_expelled
          ? false
          : (resultData.marks_obtained >= schedule.passing_marks);

        const insertQuery = `
          INSERT INTO academic.exam_results (
            result_id, exam_schedule_id, student_id, marks_obtained,
            percentage, grade, is_passed, is_absent, is_expelled,
            remarks, status, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (exam_schedule_id, student_id)
          DO UPDATE SET
            marks_obtained = EXCLUDED.marks_obtained,
            percentage = EXCLUDED.percentage,
            grade = EXCLUDED.grade,
            is_passed = EXCLUDED.is_passed,
            is_absent = EXCLUDED.is_absent,
            is_expelled = EXCLUDED.is_expelled,
            remarks = EXCLUDED.remarks,
            updated_by = EXCLUDED.updated_by,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;

        const result = await client.query(insertQuery, [
          resultId,
          batchData.exam_schedule_id,
          resultData.student_id,
          resultData.is_absent || resultData.is_expelled ? null : resultData.marks_obtained,
          percentage,
          resultData.grade || null,
          isPassed,
          resultData.is_absent || false,
          resultData.is_expelled || false,
          resultData.remarks || null,
          'Draft',
          userId,
          userId
        ]);

        results.push(result.rows[0]);
      }

      await client.query('COMMIT');

      return {
        message: `Successfully recorded ${results.length} exam results`,
        results
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get student exam results
   */
  async getStudentResults(filters) {
    const { student_id, examination_id, academic_year, exam_type } = filters;

    const conditions = ['er.is_deleted = false', 'er.student_id = $1'];
    const params = [student_id];
    let paramCount = 1;

    if (examination_id) {
      paramCount++;
      conditions.push(`es.examination_id = $${paramCount}`);
      params.push(examination_id);
    }

    if (academic_year) {
      paramCount++;
      conditions.push(`e.academic_year = $${paramCount}`);
      params.push(academic_year);
    }

    if (exam_type) {
      paramCount++;
      conditions.push(`e.exam_type = $${paramCount}`);
      params.push(exam_type);
    }

    const query = `
      SELECT er.*, es.exam_date, es.total_marks, es.passing_marks,
             s.subject_name, s.subject_code,
             e.exam_name, e.exam_type, e.academic_year
      FROM academic.exam_results er
      JOIN academic.exam_schedule es ON er.exam_schedule_id = es.schedule_id
      JOIN academic.subjects s ON es.subject_id = s.subject_id
      JOIN academic.examinations e ON es.examination_id = e.examination_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY es.exam_date DESC
    `;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get exam analytics
   */
  async getExamAnalytics(filters) {
    const { examination_id, class: className, subject_id } = filters;

    const conditions = ['e.examination_id = $1', 'er.is_deleted = false'];
    const params = [examination_id];
    let paramCount = 1;

    let subjectJoin = '';
    if (subject_id) {
      paramCount++;
      conditions.push(`es.subject_id = $${paramCount}`);
      params.push(subject_id);
      subjectJoin = 'JOIN academic.subjects s ON es.subject_id = s.subject_id';
    }

    const query = `
      SELECT
        COUNT(DISTINCT er.student_id) as total_students,
        COUNT(*) FILTER (WHERE er.is_passed = true) as passed,
        COUNT(*) FILTER (WHERE er.is_passed = false AND er.is_absent = false AND er.is_expelled = false) as failed,
        COUNT(*) FILTER (WHERE er.is_absent = true) as absent,
        COUNT(*) FILTER (WHERE er.is_expelled = true) as expelled,
        ROUND(AVG(er.percentage) FILTER (WHERE er.is_absent = false AND er.is_expelled = false), 2) as average_percentage,
        MAX(er.marks_obtained) as highest_marks,
        MIN(er.marks_obtained) FILTER (WHERE er.is_absent = false AND er.is_expelled = false) as lowest_marks
      FROM academic.exam_results er
      JOIN academic.exam_schedule es ON er.exam_schedule_id = es.schedule_id
      JOIN academic.examinations e ON es.examination_id = e.examination_id
      ${subjectJoin}
      WHERE ${conditions.join(' AND ')}
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Get top performers
   */
  async getToppers(filters) {
    const { examination_id, class: className, limit = 10 } = filters;

    const query = `
      SELECT
        er.student_id,
        AVG(er.percentage) as average_percentage,
        SUM(er.marks_obtained) as total_marks,
        COUNT(*) as subjects_appeared,
        COUNT(*) FILTER (WHERE er.is_passed = true) as subjects_passed
      FROM academic.exam_results er
      JOIN academic.exam_schedule es ON er.exam_schedule_id = es.schedule_id
      WHERE es.examination_id = $1
        AND er.is_absent = false
        AND er.is_expelled = false
        AND er.is_deleted = false
      GROUP BY er.student_id
      HAVING COUNT(*) FILTER (WHERE er.is_passed = true) = COUNT(*)
      ORDER BY average_percentage DESC
      LIMIT $2
    `;

    const result = await db.query(query, [examination_id, limit]);
    return result.rows;
  }
}

module.exports = new ExaminationService();
