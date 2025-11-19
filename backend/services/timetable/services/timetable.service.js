const db = require('../../../shared/config/database');
const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ConflictError, ValidationError } = require('../../../shared/utils/errors');

/**
 * Timetable Management Service
 * Handles timetable configuration, scheduling, and teacher workload
 */

class TimetableService {
  /**
   * Create timetable configuration
   */
  async createConfig(configData, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if active config already exists for this school and academic year
      const existingConfig = await client.query(
        `SELECT config_id FROM academic.timetable_config
         WHERE school_id = $1 AND academic_year = $2 AND is_active = true AND is_deleted = false`,
        [configData.school_id, configData.academic_year]
      );

      if (existingConfig.rows.length > 0) {
        throw new ConflictError(
          `Active configuration already exists for academic year ${configData.academic_year}`
        );
      }

      const configId = uuidv4();

      const insertQuery = `
        INSERT INTO academic.timetable_config (
          config_id, school_id, academic_year, working_days,
          periods_per_day, period_duration, break_duration, lunch_duration,
          start_time, break_after_period, lunch_after_period, is_active,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        configId,
        configData.school_id,
        configData.academic_year,
        JSON.stringify(configData.working_days),
        configData.periods_per_day,
        configData.period_duration,
        configData.break_duration || 10,
        configData.lunch_duration || 30,
        configData.start_time,
        configData.break_after_period || null,
        configData.lunch_after_period || null,
        configData.is_active !== undefined ? configData.is_active : true,
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
   * Get configuration by ID
   */
  async getConfigById(configId) {
    const query = `
      SELECT * FROM academic.timetable_config
      WHERE config_id = $1 AND is_deleted = false
    `;

    const result = await db.query(query, [configId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Timetable configuration not found');
    }

    return result.rows[0];
  }

  /**
   * Get active configuration for school
   */
  async getActiveConfig(schoolId, academicYear = null) {
    let query = `
      SELECT * FROM academic.timetable_config
      WHERE school_id = $1 AND is_active = true AND is_deleted = false
    `;
    const params = [schoolId];

    if (academicYear) {
      query += ' AND academic_year = $2';
      params.push(academicYear);
    }

    query += ' ORDER BY created_at DESC LIMIT 1';

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      throw new NotFoundError('No active timetable configuration found');
    }

    return result.rows[0];
  }

  /**
   * Update configuration
   */
  async updateConfig(configId, updates, userId) {
    await this.getConfigById(configId);

    const allowedFields = [
      'working_days',
      'periods_per_day',
      'period_duration',
      'break_duration',
      'lunch_duration',
      'start_time',
      'break_after_period',
      'lunch_after_period',
      'is_active'
    ];

    const updateFields = [];
    const params = [configId];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        paramCount++;
        if (key === 'working_days') {
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
      UPDATE academic.timetable_config
      SET ${updateFields.join(', ')}
      WHERE config_id = $1 AND is_deleted = false
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Create timetable entry
   */
  async createTimetableEntry(entryData, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Check for conflicts (same class, day, period)
      const conflictCheck = await client.query(
        `SELECT timetable_id FROM academic.timetable
         WHERE school_id = $1 AND class = $2 AND section = $3
         AND day_of_week = $4 AND period_number = $5 AND is_deleted = false`,
        [
          entryData.school_id,
          entryData.class,
          entryData.section || '',
          entryData.day_of_week,
          entryData.period_number
        ]
      );

      if (conflictCheck.rows.length > 0) {
        throw new ConflictError(
          `Timetable entry already exists for ${entryData.class}${entryData.section || ''} on ${entryData.day_of_week}, Period ${entryData.period_number}`
        );
      }

      // Check teacher availability (if teacher assigned)
      if (entryData.teacher_id) {
        const teacherConflict = await client.query(
          `SELECT timetable_id FROM academic.timetable
           WHERE teacher_id = $1 AND day_of_week = $2 AND period_number = $3
           AND is_deleted = false`,
          [entryData.teacher_id, entryData.day_of_week, entryData.period_number]
        );

        if (teacherConflict.rows.length > 0) {
          throw new ConflictError(
            `Teacher is already assigned to another class on ${entryData.day_of_week}, Period ${entryData.period_number}`
          );
        }
      }

      const timetableId = uuidv4();

      const insertQuery = `
        INSERT INTO academic.timetable (
          timetable_id, school_id, class, section, day_of_week,
          period_number, start_time, end_time, subject_id, teacher_id,
          room_number, period_type, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        timetableId,
        entryData.school_id,
        entryData.class,
        entryData.section || null,
        entryData.day_of_week,
        entryData.period_number,
        entryData.start_time,
        entryData.end_time,
        entryData.subject_id || null,
        entryData.teacher_id || null,
        entryData.room_number || null,
        entryData.period_type || 'Regular',
        userId,
        userId
      ]);

      // Update teacher workload if teacher assigned
      if (entryData.teacher_id && entryData.subject_id) {
        await this.updateTeacherWorkload(
          client,
          entryData.teacher_id,
          entryData.subject_id,
          entryData.school_id,
          userId
        );
      }

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
   * Batch create timetable entries
   */
  async batchCreateTimetable(batchData, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const results = [];

      for (const entry of batchData.entries) {
        const timetableId = uuidv4();

        const insertQuery = `
          INSERT INTO academic.timetable (
            timetable_id, school_id, class, section, day_of_week,
            period_number, start_time, end_time, subject_id, teacher_id,
            room_number, period_type, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (school_id, class, section, day_of_week, period_number)
          WHERE is_deleted = false
          DO UPDATE SET
            subject_id = EXCLUDED.subject_id,
            teacher_id = EXCLUDED.teacher_id,
            room_number = EXCLUDED.room_number,
            period_type = EXCLUDED.period_type,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            updated_by = EXCLUDED.updated_by,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;

        const result = await client.query(insertQuery, [
          timetableId,
          batchData.school_id,
          batchData.class,
          batchData.section || null,
          entry.day_of_week,
          entry.period_number,
          entry.start_time,
          entry.end_time,
          entry.subject_id || null,
          entry.teacher_id || null,
          entry.room_number || null,
          entry.period_type || 'Regular',
          userId,
          userId
        ]);

        results.push(result.rows[0]);

        // Update teacher workload
        if (entry.teacher_id && entry.subject_id) {
          await this.updateTeacherWorkload(
            client,
            entry.teacher_id,
            entry.subject_id,
            batchData.school_id,
            userId
          );
        }
      }

      await client.query('COMMIT');

      return {
        message: `Successfully created/updated ${results.length} timetable entries`,
        entries: results
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get class timetable
   */
  async getClassTimetable(filters) {
    const { school_id, class: className, section, day_of_week } = filters;

    const conditions = ['t.is_deleted = false', 't.school_id = $1', 't.class = $2'];
    const params = [school_id, className];
    let paramCount = 2;

    if (section) {
      paramCount++;
      conditions.push(`t.section = $${paramCount}`);
      params.push(section);
    }

    if (day_of_week) {
      paramCount++;
      conditions.push(`t.day_of_week = $${paramCount}`);
      params.push(day_of_week);
    }

    const query = `
      SELECT t.*, s.subject_name, s.subject_code
      FROM academic.timetable t
      LEFT JOIN academic.subjects s ON t.subject_id = s.subject_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        CASE t.day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
        END,
        t.period_number
    `;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get teacher timetable
   */
  async getTeacherTimetable(filters) {
    const { teacher_id, day_of_week } = filters;

    const conditions = ['is_deleted = false', 'teacher_id = $1'];
    const params = [teacher_id];
    let paramCount = 1;

    if (day_of_week) {
      paramCount++;
      conditions.push(`day_of_week = $${paramCount}`);
      params.push(day_of_week);
    }

    const query = `
      SELECT t.*, s.subject_name, s.subject_code
      FROM academic.timetable t
      LEFT JOIN academic.subjects s ON t.subject_id = s.subject_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        CASE t.day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
        END,
        t.period_number
    `;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Update timetable entry
   */
  async updateTimetableEntry(timetableId, updates, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Get existing entry
      const existing = await client.query(
        'SELECT * FROM academic.timetable WHERE timetable_id = $1 AND is_deleted = false',
        [timetableId]
      );

      if (existing.rows.length === 0) {
        throw new NotFoundError('Timetable entry not found');
      }

      const entry = existing.rows[0];

      // Check teacher conflict if teacher is being changed
      if (updates.teacher_id && updates.teacher_id !== entry.teacher_id) {
        const teacherConflict = await client.query(
          `SELECT timetable_id FROM academic.timetable
           WHERE teacher_id = $1 AND day_of_week = $2 AND period_number = $3
           AND timetable_id != $4 AND is_deleted = false`,
          [updates.teacher_id, entry.day_of_week, entry.period_number, timetableId]
        );

        if (teacherConflict.rows.length > 0) {
          throw new ConflictError('Teacher is already assigned to another class at this time');
        }
      }

      const allowedFields = ['subject_id', 'teacher_id', 'room_number', 'period_type', 'start_time', 'end_time'];
      const updateFields = [];
      const params = [timetableId];
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
        UPDATE academic.timetable
        SET ${updateFields.join(', ')}
        WHERE timetable_id = $1 AND is_deleted = false
        RETURNING *
      `;

      const result = await client.query(query, params);

      // Update teacher workload
      if (updates.teacher_id || updates.subject_id) {
        const teacherId = updates.teacher_id || entry.teacher_id;
        const subjectId = updates.subject_id || entry.subject_id;

        if (teacherId && subjectId) {
          await this.updateTeacherWorkload(
            client,
            teacherId,
            subjectId,
            entry.school_id,
            userId
          );
        }
      }

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
   * Update teacher workload (aggregate)
   */
  async updateTeacherWorkload(client, teacherId, subjectId, schoolId, userId) {
    // Count total periods for this teacher and subject
    const countQuery = `
      SELECT COUNT(*) as total_periods
      FROM academic.timetable
      WHERE teacher_id = $1 AND subject_id = $2 AND is_deleted = false
    `;
    const countResult = await client.query(countQuery, [teacherId, subjectId]);
    const totalPeriods = parseInt(countResult.rows[0].total_periods);

    // Upsert workload
    const upsertQuery = `
      INSERT INTO academic.teacher_workload (
        workload_id, school_id, teacher_id, subject_id,
        total_periods_per_week, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (teacher_id, subject_id)
      WHERE is_deleted = false
      DO UPDATE SET
        total_periods_per_week = EXCLUDED.total_periods_per_week,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `;

    const workloadId = uuidv4();
    await client.query(upsertQuery, [
      workloadId,
      schoolId,
      teacherId,
      subjectId,
      totalPeriods,
      userId,
      userId
    ]);
  }

  /**
   * Get teacher workload summary
   */
  async getTeacherWorkload(filters) {
    const { school_id, teacher_id } = filters;

    let query, params;

    if (teacher_id) {
      query = `
        SELECT tw.*, s.subject_name, s.subject_code
        FROM academic.teacher_workload tw
        JOIN academic.subjects s ON tw.subject_id = s.subject_id
        WHERE tw.teacher_id = $1 AND tw.is_deleted = false
        ORDER BY tw.total_periods_per_week DESC
      `;
      params = [teacher_id];
    } else {
      query = `
        SELECT tw.*, s.subject_name, s.subject_code
        FROM academic.teacher_workload tw
        JOIN academic.subjects s ON tw.subject_id = s.subject_id
        WHERE tw.school_id = $1 AND tw.is_deleted = false
        ORDER BY tw.teacher_id, tw.total_periods_per_week DESC
      `;
      params = [school_id];
    }

    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = new TimetableService();
