const Joi = require('joi');

/**
 * Subject Management Validators
 * Validates input for subject management operations
 */

// Enums
const CURRICULUM_TYPES = ['CBSE', 'ICSE', 'Cambridge', 'IB', 'State Board', 'Other'];
const SUBJECT_TYPES = ['Core', 'Elective', 'Language', 'Co-curricular', 'Vocational'];
const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const SYLLABUS_STATUS = ['Draft', 'Published', 'Archived'];

// Create Subject Schema
const createSubjectSchema = Joi.object({
  school_id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'School ID must be a valid UUID',
      'any.required': 'School ID is required'
    }),

  subject_code: Joi.string().max(20).required()
    .messages({
      'string.max': 'Subject code cannot exceed 20 characters',
      'any.required': 'Subject code is required'
    }),

  subject_name: Joi.string().max(100).required()
    .messages({
      'string.max': 'Subject name cannot exceed 100 characters',
      'any.required': 'Subject name is required'
    }),

  curriculum: Joi.string().valid(...CURRICULUM_TYPES).required()
    .messages({
      'any.only': `Curriculum must be one of: ${CURRICULUM_TYPES.join(', ')}`,
      'any.required': 'Curriculum is required'
    }),

  subject_type: Joi.string().valid(...SUBJECT_TYPES).required()
    .messages({
      'any.only': `Subject type must be one of: ${SUBJECT_TYPES.join(', ')}`,
      'any.required': 'Subject type is required'
    }),

  credits: Joi.number().min(0).max(10).precision(2).default(1.0)
    .messages({
      'number.min': 'Credits must be at least 0',
      'number.max': 'Credits cannot exceed 10'
    }),

  applicable_classes: Joi.array().items(Joi.string().valid(...CLASSES)).min(1).required()
    .messages({
      'array.min': 'At least one class must be specified',
      'any.required': 'Applicable classes are required'
    }),

  description: Joi.string().allow(null, ''),

  is_active: Joi.boolean().default(true)
});

// Update Subject Schema
const updateSubjectSchema = Joi.object({
  subject_code: Joi.string().max(20),
  subject_name: Joi.string().max(100),
  curriculum: Joi.string().valid(...CURRICULUM_TYPES),
  subject_type: Joi.string().valid(...SUBJECT_TYPES),
  credits: Joi.number().min(0).max(10).precision(2),
  applicable_classes: Joi.array().items(Joi.string().valid(...CLASSES)).min(1),
  description: Joi.string().allow(null, ''),
  is_active: Joi.boolean()
}).min(1);

// Add Syllabus Schema
const addSyllabusSchema = Joi.object({
  subject_id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Subject ID must be a valid UUID',
      'any.required': 'Subject ID is required'
    }),

  class_level: Joi.string().valid(...CLASSES).required()
    .messages({
      'any.only': `Class level must be one of: ${CLASSES.join(', ')}`,
      'any.required': 'Class level is required'
    }),

  academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/).required()
    .messages({
      'string.pattern.base': 'Academic year must be in format YYYY-YYYY (e.g., 2024-2025)',
      'any.required': 'Academic year is required'
    }),

  term: Joi.string().valid('Term 1', 'Term 2', 'Annual').default('Annual'),

  syllabus_content: Joi.object({
    units: Joi.array().items(
      Joi.object({
        unit_number: Joi.number().required(),
        unit_name: Joi.string().required(),
        topics: Joi.array().items(Joi.string()).required(),
        learning_outcomes: Joi.array().items(Joi.string()),
        duration_hours: Joi.number().min(1)
      })
    ).required(),
    textbooks: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        author: Joi.string(),
        publisher: Joi.string(),
        isbn: Joi.string()
      })
    ),
    reference_materials: Joi.array().items(Joi.string()),
    assessment_criteria: Joi.object(),
    grading_scheme: Joi.object()
  }).required()
    .messages({
      'any.required': 'Syllabus content is required'
    }),

  status: Joi.string().valid(...SYLLABUS_STATUS).default('Draft'),

  published_date: Joi.date().iso().allow(null)
});

// Update Syllabus Schema
const updateSyllabusSchema = Joi.object({
  syllabus_content: Joi.object({
    units: Joi.array().items(
      Joi.object({
        unit_number: Joi.number().required(),
        unit_name: Joi.string().required(),
        topics: Joi.array().items(Joi.string()).required(),
        learning_outcomes: Joi.array().items(Joi.string()),
        duration_hours: Joi.number().min(1)
      })
    ),
    textbooks: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        author: Joi.string(),
        publisher: Joi.string(),
        isbn: Joi.string()
      })
    ),
    reference_materials: Joi.array().items(Joi.string()),
    assessment_criteria: Joi.object(),
    grading_scheme: Joi.object()
  }),
  status: Joi.string().valid(...SYLLABUS_STATUS),
  published_date: Joi.date().iso().allow(null)
}).min(1);

// List Subjects Query Schema
const listSubjectsQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  curriculum: Joi.string().valid(...CURRICULUM_TYPES),
  subject_type: Joi.string().valid(...SUBJECT_TYPES),
  class_level: Joi.string().valid(...CLASSES),
  is_active: Joi.boolean(),
  search: Joi.string().max(100),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Get Subject by ID Schema
const getSubjectSchema = Joi.object({
  subject_id: Joi.string().uuid().required()
});

// Delete Subject Schema
const deleteSubjectSchema = Joi.object({
  subject_id: Joi.string().uuid().required()
});

// Get Syllabus Query Schema
const getSyllabusQuerySchema = Joi.object({
  subject_id: Joi.string().uuid().required(),
  class_level: Joi.string().valid(...CLASSES),
  academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/),
  status: Joi.string().valid(...SYLLABUS_STATUS)
});

module.exports = {
  createSubjectSchema,
  updateSubjectSchema,
  addSyllabusSchema,
  updateSyllabusSchema,
  listSubjectsQuerySchema,
  getSubjectSchema,
  deleteSubjectSchema,
  getSyllabusQuerySchema,

  // Export enums for use in other modules
  CURRICULUM_TYPES,
  SUBJECT_TYPES,
  CLASSES,
  SYLLABUS_STATUS
};
