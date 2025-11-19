const Joi = require('joi');

/**
 * Examination Management Validators
 * Validates input for examination scheduling, results, and analytics
 */

// Enums
const EXAM_TYPES = ['Unit Test', 'Mid-term', 'Final', 'Board Exam', 'Mock Test', 'Practical Exam'];
const EXAM_STATUS = ['Scheduled', 'Ongoing', 'Completed', 'Cancelled', 'Postponed'];
const RESULT_STATUS = ['Draft', 'Published', 'Under Review'];

// Create Examination Schema
const createExaminationSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  exam_name: Joi.string().max(200).required(),
  exam_type: Joi.string().valid(...EXAM_TYPES).required(),
  academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/).required()
    .messages({
      'string.pattern.base': 'Academic year must be in format YYYY-YYYY (e.g., 2024-2025)'
    }),
  applicable_classes: Joi.array().items(Joi.string().max(10)).min(1).required(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().greater(Joi.ref('start_date')).required()
    .messages({
      'date.greater': 'End date must be after start date'
    }),
  instructions: Joi.string().allow(null, ''),
  status: Joi.string().valid(...EXAM_STATUS).default('Scheduled')
});

// Update Examination Schema
const updateExaminationSchema = Joi.object({
  exam_name: Joi.string().max(200),
  exam_type: Joi.string().valid(...EXAM_TYPES),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  instructions: Joi.string().allow(null, ''),
  status: Joi.string().valid(...EXAM_STATUS)
}).min(1);

// List Examinations Query Schema
const listExaminationsQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  exam_type: Joi.string().valid(...EXAM_TYPES),
  academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/),
  status: Joi.string().valid(...EXAM_STATUS),
  class: Joi.string().max(10),
  from_date: Joi.date().iso(),
  to_date: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Add Exam Schedule Schema
const addExamScheduleSchema = Joi.object({
  examination_id: Joi.string().uuid().required(),
  subject_id: Joi.string().uuid().required(),
  exam_date: Joi.date().iso().required(),
  start_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required()
    .messages({
      'string.pattern.base': 'Start time must be in HH:MM format (e.g., 09:00)'
    }),
  end_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required()
    .messages({
      'string.pattern.base': 'End time must be in HH:MM format (e.g., 11:00)'
    }),
  duration_minutes: Joi.number().min(1).max(600).required(),
  total_marks: Joi.number().min(1).max(1000).required(),
  passing_marks: Joi.number().min(0).max(1000),
  room_number: Joi.string().max(50).allow(null, ''),
  invigilator_ids: Joi.array().items(Joi.string().uuid()).allow(null),
  instructions: Joi.string().allow(null, '')
});

// Update Exam Schedule Schema
const updateExamScheduleSchema = Joi.object({
  exam_date: Joi.date().iso(),
  start_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
  end_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
  duration_minutes: Joi.number().min(1).max(600),
  total_marks: Joi.number().min(1).max(1000),
  passing_marks: Joi.number().min(0).max(1000),
  room_number: Joi.string().max(50).allow(null, ''),
  invigilator_ids: Joi.array().items(Joi.string().uuid()).allow(null),
  instructions: Joi.string().allow(null, '')
}).min(1);

// Record Exam Result Schema
const recordExamResultSchema = Joi.object({
  exam_schedule_id: Joi.string().uuid().required(),
  student_id: Joi.string().uuid().required(),
  marks_obtained: Joi.number().min(0).required(),
  is_absent: Joi.boolean().default(false),
  is_expelled: Joi.boolean().default(false),
  grade: Joi.string().max(5).allow(null, ''),
  remarks: Joi.string().max(500).allow(null, '')
});

// Batch Record Results Schema
const batchRecordResultsSchema = Joi.object({
  exam_schedule_id: Joi.string().uuid().required(),
  results: Joi.array().items(
    Joi.object({
      student_id: Joi.string().uuid().required(),
      marks_obtained: Joi.number().min(0).required(),
      is_absent: Joi.boolean().default(false),
      is_expelled: Joi.boolean().default(false),
      grade: Joi.string().max(5).allow(null, ''),
      remarks: Joi.string().max(500).allow(null, '')
    })
  ).min(1).max(200).required()
});

// Update Exam Result Schema
const updateExamResultSchema = Joi.object({
  marks_obtained: Joi.number().min(0),
  is_absent: Joi.boolean(),
  is_expelled: Joi.boolean(),
  grade: Joi.string().max(5).allow(null, ''),
  remarks: Joi.string().max(500).allow(null, '')
}).min(1);

// Publish Results Schema
const publishResultsSchema = Joi.object({
  examination_id: Joi.string().uuid().required(),
  status: Joi.string().valid('Published').required()
});

// Get Student Results Query Schema
const getStudentResultsQuerySchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  examination_id: Joi.string().uuid(),
  academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/),
  exam_type: Joi.string().valid(...EXAM_TYPES)
});

// Exam Analytics Query Schema
const examAnalyticsQuerySchema = Joi.object({
  examination_id: Joi.string().uuid().required(),
  class: Joi.string().max(10),
  subject_id: Joi.string().uuid()
});

// Toppers Query Schema
const toppersQuerySchema = Joi.object({
  examination_id: Joi.string().uuid().required(),
  class: Joi.string().max(10),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

module.exports = {
  createExaminationSchema,
  updateExaminationSchema,
  listExaminationsQuerySchema,
  addExamScheduleSchema,
  updateExamScheduleSchema,
  recordExamResultSchema,
  batchRecordResultsSchema,
  updateExamResultSchema,
  publishResultsSchema,
  getStudentResultsQuerySchema,
  examAnalyticsQuerySchema,
  toppersQuerySchema,

  // Export enums
  EXAM_TYPES,
  EXAM_STATUS,
  RESULT_STATUS
};
