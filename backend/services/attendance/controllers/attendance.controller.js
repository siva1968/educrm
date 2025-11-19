const attendanceService = require('../services/attendance.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  markAttendanceSchema,
  bulkAttendanceSchema,
  leaveApplicationSchema,
  attendanceQuerySchema,
  attendancePolicySchema,
} = require('../validators/attendance.validator');

class AttendanceController {
  /**
   * Mark attendance for single student
   */
  async markAttendance(req, res, next) {
    try {
      const { error, value } = markAttendanceSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const attendance = await attendanceService.markAttendance(value, userId);

      return ApiResponse.created(res, attendance, 'Attendance marked successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark bulk attendance for class
   */
  async markBulkAttendance(req, res, next) {
    try {
      const { error, value } = bulkAttendanceSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const attendance = await attendanceService.markBulkAttendance(value, userId);

      return ApiResponse.created(res, attendance, `Bulk attendance marked for ${attendance.length} students`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get attendance records
   */
  async getAttendance(req, res, next) {
    try {
      const { error, value } = attendanceQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const result = await attendanceService.getAttendance(value);

      return ApiResponse.paginated(
        res,
        result.attendance,
        result.pagination,
        'Attendance records retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student attendance summary
   */
  async getStudentSummary(req, res, next) {
    try {
      const { student_id } = req.params;
      const { month_year } = req.query;

      const summary = await attendanceService.getStudentAttendanceSummary(student_id, month_year);

      if (!summary) {
        return ApiResponse.notFound(res, 'No attendance data found for this period');
      }

      return ApiResponse.success(res, summary, 'Attendance summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Apply for leave
   */
  async applyLeave(req, res, next) {
    try {
      const { error, value } = leaveApplicationSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const leave = await attendanceService.applyLeave(value, userId);

      return ApiResponse.created(res, leave, 'Leave application submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve or reject leave
   */
  async updateLeaveStatus(req, res, next) {
    try {
      const { leave_id } = req.params;
      const { status, rejection_reason } = req.body;

      if (!status || !['Approved', 'Rejected'].includes(status)) {
        return ApiResponse.validationError(res, ['Status must be Approved or Rejected']);
      }

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const leave = await attendanceService.updateLeaveStatus(leave_id, status, rejection_reason, userId);

      return ApiResponse.success(res, leave, `Leave ${status.toLowerCase()} successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get class attendance report
   */
  async getClassReport(req, res, next) {
    try {
      const { school_id, class: classId, date } = req.query;

      if (!school_id || !classId || !date) {
        return ApiResponse.validationError(res, ['school_id, class, and date are required']);
      }

      const report = await attendanceService.getClassAttendanceReport(school_id, classId, date);

      return ApiResponse.success(res, report, 'Class attendance report retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get students with low attendance
   */
  async getLowAttendance(req, res, next) {
    try {
      const { school_id, threshold } = req.query;

      if (!school_id) {
        return ApiResponse.validationError(res, ['school_id is required']);
      }

      const students = await attendanceService.getStudentsWithLowAttendance(
        school_id,
        threshold ? parseFloat(threshold) : 75
      );

      return ApiResponse.success(res, students, `Found ${students.length} students with low attendance`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create or update attendance policy
   */
  async upsertPolicy(req, res, next) {
    try {
      const { error, value } = attendancePolicySchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const policy = await attendanceService.upsertAttendancePolicy(value, userId);

      return ApiResponse.success(res, policy, 'Attendance policy saved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AttendanceController();
