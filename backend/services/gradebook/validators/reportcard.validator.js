const Joi = require('joi');

/**
 * Report Card Validators
 * Validates input for report card generation and management
 */

// Enums
const REPORT_STATUS = ['Draft', 'Published', 'Sent to Parents'];
const TERMS = ['Term 1', 'Term 2', 'Annual', 'Semester 1', 'Semester 2'];

// Generate Report Card Schema
const generateReportCardSchema = Joi.object({
  student_id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Student ID must be a valid UUID',
      'any.required': 'Student ID is required'
    }),

  school_id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'School ID must be a valid UUID',
      'any.required': 'School ID is required'
    }),

  class: Joi.string().max(10).required()
    .messages({
      'any.required': 'Class is required'
    }),

  academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/).required()
    .messages({
      'string.pattern.base': 'Academic year must be in format YYYY-YYYY (e.g., 2024-2025)',
      'any.required': 'Academic year is required'
    }),

  term: Joi.string().valid(...TERMS).required()
    .messages({
      'any.only': `Term must be one of: ${TERMS.join(', ')}`,
      'any.required': 'Term is required'
    }),

  include_assessments: Joi.array().items(Joi.string().uuid()).allow(null),

  calculate_rank: Joi.boolean().default(true)
});

// Update Report Card Schema
const updateReportCardSchema = Joi.object({
  teacher_remarks: Joi.string().max(1000).allow(null, ''),
  principal_remarks: Joi.string().max(1000).allow(null, ''),
  status: Joi.string().valid(...REPORT_STATUS)
}).min(1);

// Publish Report Card Schema
const publishReportCardSchema = Joi.object({
  teacher_remarks: Joi.string().max(1000).allow(null, ''),
  principal_remarks: Joi.string().max(1000).allow(null, ''),
  notify_parents: Joi.boolean().default(false)
});

// List Report Cards Query Schema
const listReportCardsQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  student_id: Joi.string().uuid(),
  class: Joi.string().max(10),
  academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/),
  term: Joi.string().valid(...TERMS),
  status: Joi.string().valid(...REPORT_STATUS),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Get Student Report Cards Query Schema
const getStudentReportCardsQuerySchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/),
  term: Joi.string().valid(...TERMS)
});

// Bulk Generate Schema
const bulkGenerateReportCardsSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  class: Joi.string().max(10).required(),
  section: Joi.string().max(10).allow(null, ''),
  academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/).required(),
  term: Joi.string().valid(...TERMS).required(),
  student_ids: Joi.array().items(Joi.string().uuid()).min(1).max(200),
  calculate_rank: Joi.boolean().default(true)
});

module.exports = {
  generateReportCardSchema,
  updateReportCardSchema,
  publishReportCardSchema,
  listReportCardsQuerySchema,
  getStudentReportCardsQuerySchema,
  bulkGenerateReportCardsSchema,

  // Export enums
  REPORT_STATUS,
  TERMS
};
