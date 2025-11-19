const Joi = require('joi');

const markAttendanceSchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  school_id: Joi.string().uuid().required(),
  class: Joi.string().max(10).required(),
  attendance_date: Joi.date().max('now').required(),
  status: Joi.string().valid('Present', 'Absent', 'Leave', 'Late', 'Half Day', 'Excused Absent').required(),
  check_in_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).optional().allow('', null),
  check_out_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).optional().allow('', null),
  marked_by_method: Joi.string().valid('Biometric', 'Manual', 'RFID', 'Mobile').optional(),
  absence_reason: Joi.string().max(255).optional().allow('', null),
  late_minutes: Joi.number().integer().min(0).optional(),
  late_reason: Joi.string().max(255).optional().allow('', null),
});

const bulkAttendanceSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  class: Joi.string().max(10).required(),
  attendance_date: Joi.date().max('now').required(),
  marked_by_method: Joi.string().valid('Biometric', 'Manual', 'RFID', 'Mobile').optional(),
  attendance_records: Joi.array().items(
    Joi.object({
      student_id: Joi.string().uuid().required(),
      status: Joi.string().valid('Present', 'Absent', 'Leave', 'Late', 'Half Day', 'Excused Absent').required(),
      check_in_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).optional().allow('', null),
      late_minutes: Joi.number().integer().min(0).optional(),
      absence_reason: Joi.string().max(255).optional().allow('', null),
    })
  ).min(1).required(),
});

const leaveApplicationSchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  school_id: Joi.string().uuid().required(),
  leave_type: Joi.string().valid('Casual', 'Medical', 'Earned', 'Emergency', 'Other').required(),
  from_date: Joi.date().required(),
  to_date: Joi.date().min(Joi.ref('from_date')).required(),
  reason: Joi.string().required(),
  supporting_document_url: Joi.string().uri().optional().allow('', null),
});

const attendanceQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  class: Joi.string().max(10).optional(),
  student_id: Joi.string().uuid().optional(),
  from_date: Joi.date().optional(),
  to_date: Joi.date().min(Joi.ref('from_date')).optional(),
  status: Joi.string().valid('Present', 'Absent', 'Leave', 'Late', 'Half Day', 'Excused Absent').optional(),
  page: Joi.number().integer().min(1).optional(),
  page_size: Joi.number().integer().min(1).max(500).optional(),
});

const attendancePolicySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  policy_name: Joi.string().max(255).required(),
  min_attendance_percentage: Joi.number().min(0).max(100).default(75),
  leave_types: Joi.object().default({ casual: 10, medical: 15, earned: 20 }),
  alert_absent_days: Joi.number().integer().min(1).default(5),
  alert_late_arrivals: Joi.number().integer().min(1).default(10),
  alert_low_attendance_percentage: Joi.number().min(0).max(100).default(75),
  biometric_enabled: Joi.boolean().default(false),
  working_days: Joi.array().items(
    Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  ).default(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
});

module.exports = {
  markAttendanceSchema,
  bulkAttendanceSchema,
  leaveApplicationSchema,
  attendanceQuerySchema,
  attendancePolicySchema,
};
