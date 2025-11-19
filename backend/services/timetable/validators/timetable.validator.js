const Joi = require('joi');

/**
 * Timetable Management Validators
 * Validates input for timetable configuration and scheduling
 */

// Enums
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIOD_TYPES = ['Regular', 'Break', 'Lunch', 'Assembly', 'Sports', 'Library'];

// Create Timetable Configuration Schema
const createConfigSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/).required()
    .messages({
      'string.pattern.base': 'Academic year must be in format YYYY-YYYY (e.g., 2024-2025)'
    }),
  working_days: Joi.array().items(Joi.string().valid(...DAYS_OF_WEEK)).min(5).max(6).required()
    .messages({
      'array.min': 'At least 5 working days required',
      'array.max': 'Maximum 6 working days allowed'
    }),
  periods_per_day: Joi.number().integer().min(4).max(12).required()
    .messages({
      'number.min': 'At least 4 periods required',
      'number.max': 'Maximum 12 periods allowed'
    }),
  period_duration: Joi.number().integer().min(20).max(90).required()
    .messages({
      'number.min': 'Period duration must be at least 20 minutes',
      'number.max': 'Period duration cannot exceed 90 minutes'
    }),
  break_duration: Joi.number().integer().min(5).max(30).default(10),
  lunch_duration: Joi.number().integer().min(15).max(60).default(30),
  start_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required()
    .messages({
      'string.pattern.base': 'Start time must be in HH:MM format (e.g., 08:00)'
    }),
  break_after_period: Joi.number().integer().min(1).allow(null),
  lunch_after_period: Joi.number().integer().min(1).allow(null),
  is_active: Joi.boolean().default(true)
});

// Update Configuration Schema
const updateConfigSchema = Joi.object({
  working_days: Joi.array().items(Joi.string().valid(...DAYS_OF_WEEK)).min(5).max(6),
  periods_per_day: Joi.number().integer().min(4).max(12),
  period_duration: Joi.number().integer().min(20).max(90),
  break_duration: Joi.number().integer().min(5).max(30),
  lunch_duration: Joi.number().integer().min(15).max(60),
  start_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
  break_after_period: Joi.number().integer().min(1).allow(null),
  lunch_after_period: Joi.number().integer().min(1).allow(null),
  is_active: Joi.boolean()
}).min(1);

// Create/Update Timetable Entry Schema
const createTimetableEntrySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  class: Joi.string().max(10).required(),
  section: Joi.string().max(10).allow(null, ''),
  day_of_week: Joi.string().valid(...DAYS_OF_WEEK).required(),
  period_number: Joi.number().integer().min(1).max(12).required(),
  start_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
  end_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
  subject_id: Joi.string().uuid().allow(null),
  teacher_id: Joi.string().uuid().allow(null),
  room_number: Joi.string().max(50).allow(null, ''),
  period_type: Joi.string().valid(...PERIOD_TYPES).default('Regular')
});

// Update Timetable Entry Schema
const updateTimetableEntrySchema = Joi.object({
  subject_id: Joi.string().uuid().allow(null),
  teacher_id: Joi.string().uuid().allow(null),
  room_number: Joi.string().max(50).allow(null, ''),
  period_type: Joi.string().valid(...PERIOD_TYPES),
  start_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
  end_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
}).min(1);

// Get Class Timetable Query Schema
const getClassTimetableQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  class: Joi.string().max(10).required(),
  section: Joi.string().max(10),
  day_of_week: Joi.string().valid(...DAYS_OF_WEEK)
});

// Get Teacher Timetable Query Schema
const getTeacherTimetableQuerySchema = Joi.object({
  teacher_id: Joi.string().uuid().required(),
  day_of_week: Joi.string().valid(...DAYS_OF_WEEK)
});

// Create Substitution Schema
const createSubstitutionSchema = Joi.object({
  timetable_id: Joi.string().uuid().required(),
  original_teacher_id: Joi.string().uuid().required(),
  substitute_teacher_id: Joi.string().uuid().required(),
  substitution_date: Joi.date().iso().required(),
  reason: Joi.string().max(500).required()
});

// Batch Create Timetable Schema
const batchCreateTimetableSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  class: Joi.string().max(10).required(),
  section: Joi.string().max(10).allow(null, ''),
  entries: Joi.array().items(
    Joi.object({
      day_of_week: Joi.string().valid(...DAYS_OF_WEEK).required(),
      period_number: Joi.number().integer().min(1).max(12).required(),
      start_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
      end_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
      subject_id: Joi.string().uuid().allow(null),
      teacher_id: Joi.string().uuid().allow(null),
      room_number: Joi.string().max(50).allow(null, ''),
      period_type: Joi.string().valid(...PERIOD_TYPES).default('Regular')
    })
  ).min(1).required()
});

// Get Teacher Workload Query Schema
const getTeacherWorkloadQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  teacher_id: Joi.string().uuid(),
  academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/)
});

module.exports = {
  createConfigSchema,
  updateConfigSchema,
  createTimetableEntrySchema,
  updateTimetableEntrySchema,
  getClassTimetableQuerySchema,
  getTeacherTimetableQuerySchema,
  createSubstitutionSchema,
  batchCreateTimetableSchema,
  getTeacherWorkloadQuerySchema,

  // Export enums
  DAYS_OF_WEEK,
  PERIOD_TYPES
};
