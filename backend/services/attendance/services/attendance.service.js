const { query, transaction } = require('../../../shared/config/database');
const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ConflictError, BadRequestError } = require('../../../shared/utils/errors');
const logger = require('../../../shared/utils/logger');

class AttendanceService {
  /**
   * Mark attendance for a single student
   */
  async markAttendance(attendanceData, userId) {
    try {
      // Check if attendance already exists for this date
      const existing = await query(
        `SELECT attendance_id FROM attendance_mgmt.attendance_daily
         WHERE student_id = $1 AND attendance_date = $2`,
        [attendanceData.student_id, attendanceData.attendance_date]
      );

      if (existing.rows.length > 0) {
        throw new ConflictError('Attendance already marked for this date');
      }

      const attendanceId = uuidv4();

      const result = await query(
        `INSERT INTO attendance_mgmt.attendance_daily (
          attendance_id, student_id, school_id, class, attendance_date,
          check_in_time, check_out_time, status, marked_by_method,
          absence_reason, late_minutes, late_reason, marked_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          attendanceId,
          attendanceData.student_id,
          attendanceData.school_id,
          attendanceData.class,
          attendanceData.attendance_date,
          attendanceData.check_in_time || null,
          attendanceData.check_out_time || null,
          attendanceData.status,
          attendanceData.marked_by_method || 'Manual',
          attendanceData.absence_reason || null,
          attendanceData.late_minutes || null,
          attendanceData.late_reason || null,
          userId
        ]
      );

      // Update attendance patterns
      await this.updateAttendancePattern(attendanceData.student_id, attendanceData.school_id, attendanceData.attendance_date);

      logger.info(`Attendance marked: ${attendanceId} for student: ${attendanceData.student_id}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error marking attendance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark bulk attendance for a class
   */
  async markBulkAttendance(bulkData, userId) {
    try {
      const results = await transaction(async (client) => {
        const insertedRecords = [];

        for (const record of bulkData.attendance_records) {
          const attendanceId = uuidv4();

          const result = await client.query(
            `INSERT INTO attendance_mgmt.attendance_daily (
              attendance_id, student_id, school_id, class, attendance_date,
              check_in_time, status, marked_by_method, absence_reason,
              late_minutes, marked_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (student_id, attendance_date)
            DO UPDATE SET
              status = EXCLUDED.status,
              check_in_time = EXCLUDED.check_in_time,
              late_minutes = EXCLUDED.late_minutes,
              absence_reason = EXCLUDED.absence_reason,
              updated_at = CURRENT_TIMESTAMP
            RETURNING *`,
            [
              attendanceId,
              record.student_id,
              bulkData.school_id,
              bulkData.class,
              bulkData.attendance_date,
              record.check_in_time || null,
              record.status,
              bulkData.marked_by_method || 'Manual',
              record.absence_reason || null,
              record.late_minutes || null,
              userId
            ]
          );

          insertedRecords.push(result.rows[0]);
        }

        return insertedRecords;
      });

      // Update patterns for all students
      for (const record of bulkData.attendance_records) {
        await this.updateAttendancePattern(record.student_id, bulkData.school_id, bulkData.attendance_date);
      }

      logger.info(`Bulk attendance marked for ${results.length} students`);
      return results;
    } catch (error) {
      logger.error(`Error marking bulk attendance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get attendance records with filtering
   */
  async getAttendance(filters) {
    let queryText = `
      SELECT a.*, s.first_name, s.last_name, s.roll_no
      FROM attendance_mgmt.attendance_daily a
      JOIN sis_core.students s ON a.student_id = s.student_id
      WHERE 1=1
    `;
    const params = [];
    let paramCounter = 1;

    if (filters.school_id) {
      queryText += ` AND a.school_id = $${paramCounter}`;
      params.push(filters.school_id);
      paramCounter++;
    }

    if (filters.class) {
      queryText += ` AND a.class = $${paramCounter}`;
      params.push(filters.class);
      paramCounter++;
    }

    if (filters.student_id) {
      queryText += ` AND a.student_id = $${paramCounter}`;
      params.push(filters.student_id);
      paramCounter++;
    }

    if (filters.from_date) {
      queryText += ` AND a.attendance_date >= $${paramCounter}`;
      params.push(filters.from_date);
      paramCounter++;
    }

    if (filters.to_date) {
      queryText += ` AND a.attendance_date <= $${paramCounter}`;
      params.push(filters.to_date);
      paramCounter++;
    }

    if (filters.status) {
      queryText += ` AND a.status = $${paramCounter}`;
      params.push(filters.status);
      paramCounter++;
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM (${queryText}) as counted`;
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].total);

    // Add sorting and pagination
    queryText += ` ORDER BY a.attendance_date DESC, s.roll_no ASC`;

    const page = parseInt(filters.page) || 1;
    const pageSize = Math.min(parseInt(filters.page_size) || 50, 500);
    const offset = (page - 1) * pageSize;

    queryText += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(pageSize, offset);

    const result = await query(queryText, params);

    return {
      attendance: result.rows,
      pagination: {
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  }

  /**
   * Update attendance pattern for a student
   */
  async updateAttendancePattern(studentId, schoolId, attendanceDate) {
    try {
      const monthYear = new Date(attendanceDate);
      monthYear.setDate(1); // First day of month

      // Get attendance stats for the month
      const stats = await query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'Present') as present,
          COUNT(*) FILTER (WHERE status = 'Absent') as absent,
          COUNT(*) FILTER (WHERE status = 'Leave') as leave,
          COUNT(*) FILTER (WHERE status = 'Late') as late,
          COUNT(*) FILTER (WHERE status = 'Half Day') as half_day
         FROM attendance_mgmt.attendance_daily
         WHERE student_id = $1
         AND DATE_TRUNC('month', attendance_date) = $2`,
        [studentId, monthYear]
      );

      const record = stats.rows[0];
      const totalDays = parseInt(record.present) + parseInt(record.absent) + parseInt(record.leave) + parseInt(record.half_day);
      const attendancePercentage = totalDays > 0 ? ((parseInt(record.present) + parseInt(record.half_day) * 0.5) / totalDays * 100).toFixed(2) : 0;

      // Check for consecutive absences
      const consecutive = await query(
        `SELECT COUNT(*) as count
         FROM attendance_mgmt.attendance_daily
         WHERE student_id = $1
         AND status = 'Absent'
         AND attendance_date > (CURRENT_DATE - INTERVAL '30 days')
         ORDER BY attendance_date DESC`,
        [studentId]
      );

      const requiresAttention = attendancePercentage < 75 || parseInt(consecutive.rows[0].count) >= 5;

      // Upsert pattern record
      await query(
        `INSERT INTO attendance_mgmt.attendance_patterns (
          student_id, school_id, month_year, total_days_present, total_days_absent,
          total_days_leave, total_late_arrivals, total_half_days, attendance_percentage,
          requires_attention, consecutive_absences_max
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (student_id, month_year)
        DO UPDATE SET
          total_days_present = EXCLUDED.total_days_present,
          total_days_absent = EXCLUDED.total_days_absent,
          total_days_leave = EXCLUDED.total_days_leave,
          total_late_arrivals = EXCLUDED.total_late_arrivals,
          total_half_days = EXCLUDED.total_half_days,
          attendance_percentage = EXCLUDED.attendance_percentage,
          requires_attention = EXCLUDED.requires_attention,
          consecutive_absences_max = EXCLUDED.consecutive_absences_max,
          updated_at = CURRENT_TIMESTAMP`,
        [
          studentId,
          schoolId,
          monthYear,
          record.present,
          record.absent,
          record.leave,
          record.late,
          record.half_day,
          attendancePercentage,
          requiresAttention,
          consecutive.rows[0].count
        ]
      );
    } catch (error) {
      logger.error(`Error updating attendance pattern: ${error.message}`);
    }
  }

  /**
   * Get attendance summary for a student
   */
  async getStudentAttendanceSummary(studentId, monthYear = null) {
    const month = monthYear ? new Date(monthYear) : new Date();
    month.setDate(1);

    const result = await query(
      `SELECT * FROM attendance_mgmt.attendance_patterns
       WHERE student_id = $1 AND month_year = $2`,
      [studentId, month]
    );

    return result.rows[0] || null;
  }

  /**
   * Apply for leave
   */
  async applyLeave(leaveData, userId) {
    try {
      const leaveId = uuidv4();

      // Calculate total days
      const fromDate = new Date(leaveData.from_date);
      const toDate = new Date(leaveData.to_date);
      const totalDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;

      const result = await query(
        `INSERT INTO attendance_mgmt.leave_applications (
          leave_id, student_id, school_id, leave_type, from_date, to_date,
          total_days, reason, supporting_document_url, applied_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          leaveId,
          leaveData.student_id,
          leaveData.school_id,
          leaveData.leave_type,
          leaveData.from_date,
          leaveData.to_date,
          totalDays,
          leaveData.reason,
          leaveData.supporting_document_url || null,
          userId
        ]
      );

      logger.info(`Leave application submitted: ${leaveId} for student: ${leaveData.student_id}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error applying leave: ${error.message}`);
      throw error;
    }
  }

  /**
   * Approve/Reject leave
   */
  async updateLeaveStatus(leaveId, status, rejectionReason = null, userId) {
    if (!['Approved', 'Rejected'].includes(status)) {
      throw new BadRequestError('Invalid status. Must be Approved or Rejected');
    }

    const result = await query(
      `UPDATE attendance_mgmt.leave_applications
       SET approval_status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP,
           rejection_reason = $3, updated_at = CURRENT_TIMESTAMP
       WHERE leave_id = $4
       RETURNING *`,
      [status, userId, rejectionReason, leaveId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Leave application not found');
    }

    logger.info(`Leave ${status}: ${leaveId}`);
    return result.rows[0];
  }

  /**
   * Get class attendance report for a specific date
   */
  async getClassAttendanceReport(schoolId, classId, date) {
    const result = await query(
      `SELECT
        a.status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
       FROM attendance_mgmt.attendance_daily a
       WHERE a.school_id = $1 AND a.class = $2 AND a.attendance_date = $3
       GROUP BY a.status`,
      [schoolId, classId, date]
    );

    const total = await query(
      `SELECT COUNT(*) as total FROM attendance_mgmt.attendance_daily
       WHERE school_id = $1 AND class = $2 AND attendance_date = $3`,
      [schoolId, classId, date]
    );

    return {
      date,
      class: classId,
      total_students: parseInt(total.rows[0]?.total || 0),
      breakdown: result.rows,
    };
  }

  /**
   * Get students with low attendance
   */
  async getStudentsWithLowAttendance(schoolId, threshold = 75) {
    const result = await query(
      `SELECT
        p.student_id, p.attendance_percentage, p.consecutive_absences_max,
        s.first_name, s.last_name, s.roll_no, s.class, s.email
       FROM attendance_mgmt.attendance_patterns p
       JOIN sis_core.students s ON p.student_id = s.student_id
       WHERE p.school_id = $1
       AND p.attendance_percentage < $2
       AND p.month_year = DATE_TRUNC('month', CURRENT_DATE)
       ORDER BY p.attendance_percentage ASC`,
      [schoolId, threshold]
    );

    return result.rows;
  }

  /**
   * Create or update attendance policy
   */
  async upsertAttendancePolicy(policyData, userId) {
    try {
      const policyId = uuidv4();

      const result = await query(
        `INSERT INTO attendance_mgmt.attendance_policies (
          policy_id, school_id, policy_name, min_attendance_percentage,
          leave_types, alert_absent_days, alert_late_arrivals,
          alert_low_attendance_percentage, biometric_enabled, working_days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (school_id, policy_name)
        DO UPDATE SET
          min_attendance_percentage = EXCLUDED.min_attendance_percentage,
          leave_types = EXCLUDED.leave_types,
          alert_absent_days = EXCLUDED.alert_absent_days,
          alert_late_arrivals = EXCLUDED.alert_late_arrivals,
          alert_low_attendance_percentage = EXCLUDED.alert_low_attendance_percentage,
          biometric_enabled = EXCLUDED.biometric_enabled,
          working_days = EXCLUDED.working_days,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [
          policyId,
          policyData.school_id,
          policyData.policy_name,
          policyData.min_attendance_percentage,
          JSON.stringify(policyData.leave_types),
          policyData.alert_absent_days,
          policyData.alert_late_arrivals,
          policyData.alert_low_attendance_percentage,
          policyData.biometric_enabled,
          JSON.stringify(policyData.working_days)
        ]
      );

      logger.info(`Attendance policy created/updated: ${policyId}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error upserting attendance policy: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new AttendanceService();
