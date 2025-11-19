const Joi = require('joi');

/**
 * Assignment Management Validators
 * Validates input for assignment and submission operations
 */

// Enums
const ASSIGNMENT_TYPES = ['Homework', 'Project', 'Lab Work', 'Research', 'Presentation', 'Essay', 'Problem Set'];
const ASSIGNMENT_STATUS = ['Draft', 'Published', 'Closed', 'Archived'];
const SUBMISSION_STATUS = ['Pending', 'Submitted', 'Graded', 'Returned', 'Late'];

// Create Assignment Schema
const createAssignmentSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  subject_id: Joi.string().uuid().required(),
  teacher_id: Joi.string().uuid().required(),
  assignment_type: Joi.string().valid(...ASSIGNMENT_TYPES).required(),
  assignment_title: Joi.string().max(200).required(),
  description: Joi.string().required(),
  class: Joi.string().max(10).required(),
  section: Joi.string().max(10).allow(null, ''),
  assigned_date: Joi.date().iso().required(),
  due_date: Joi.date().iso().greater(Joi.ref('assigned_date')).required()
    .messages({
      'date.greater': 'Due date must be after assigned date'
    }),
  max_marks: Joi.number().min(1).max(1000).required(),
  instructions: Joi.string().allow(null, ''),
  attachments: Joi.array().items(
    Joi.object({
      file_name: Joi.string().required(),
      file_url: Joi.string().uri().required(),
      file_size: Joi.number(),
      file_type: Joi.string()
    })
  ).allow(null),
  allow_late_submission: Joi.boolean().default(false),
  late_penalty_percentage: Joi.number().min(0).max(100).default(0),
  status: Joi.string().valid(...ASSIGNMENT_STATUS).default('Draft')
});

// Update Assignment Schema
const updateAssignmentSchema = Joi.object({
  assignment_type: Joi.string().valid(...ASSIGNMENT_TYPES),
  assignment_title: Joi.string().max(200),
  description: Joi.string(),
  assigned_date: Joi.date().iso(),
  due_date: Joi.date().iso(),
  max_marks: Joi.number().min(1).max(1000),
  instructions: Joi.string().allow(null, ''),
  attachments: Joi.array().items(
    Joi.object({
      file_name: Joi.string().required(),
      file_url: Joi.string().uri().required(),
      file_size: Joi.number(),
      file_type: Joi.string()
    })
  ).allow(null),
  allow_late_submission: Joi.boolean(),
  late_penalty_percentage: Joi.number().min(0).max(100),
  status: Joi.string().valid(...ASSIGNMENT_STATUS)
}).min(1);

// List Assignments Query Schema
const listAssignmentsQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  subject_id: Joi.string().uuid(),
  teacher_id: Joi.string().uuid(),
  class: Joi.string().max(10),
  section: Joi.string().max(10),
  assignment_type: Joi.string().valid(...ASSIGNMENT_TYPES),
  status: Joi.string().valid(...ASSIGNMENT_STATUS),
  from_date: Joi.date().iso(),
  to_date: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Submit Assignment Schema
const submitAssignmentSchema = Joi.object({
  assignment_id: Joi.string().uuid().required(),
  student_id: Joi.string().uuid().required(),
  submission_content: Joi.string().allow(null, ''),
  attachments: Joi.array().items(
    Joi.object({
      file_name: Joi.string().required(),
      file_url: Joi.string().uri().required(),
      file_size: Joi.number(),
      file_type: Joi.string()
    })
  ).min(1).required()
    .messages({
      'array.min': 'At least one attachment is required'
    }),
  remarks: Joi.string().max(500).allow(null, '')
});

// Update Submission Schema
const updateSubmissionSchema = Joi.object({
  submission_content: Joi.string().allow(null, ''),
  attachments: Joi.array().items(
    Joi.object({
      file_name: Joi.string().required(),
      file_url: Joi.string().uri().required(),
      file_size: Joi.number(),
      file_type: Joi.string()
    })
  ),
  remarks: Joi.string().max(500).allow(null, '')
}).min(1);

// Grade Submission Schema
const gradeSubmissionSchema = Joi.object({
  marks_obtained: Joi.number().min(0).required(),
  feedback: Joi.string().max(1000).allow(null, ''),
  graded_date: Joi.date().iso().default(() => new Date())
});

// Get My Assignments Query Schema (for students)
const getMyAssignmentsQuerySchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  subject_id: Joi.string().uuid(),
  status: Joi.string().valid('pending', 'submitted', 'graded'),
  from_date: Joi.date().iso(),
  to_date: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Get Submissions Query Schema
const getSubmissionsQuerySchema = Joi.object({
  assignment_id: Joi.string().uuid().required(),
  status: Joi.string().valid(...SUBMISSION_STATUS),
  student_id: Joi.string().uuid()
});

// Assignment Analytics Query Schema
const assignmentAnalyticsQuerySchema = Joi.object({
  assignment_id: Joi.string().uuid().required()
});

module.exports = {
  createAssignmentSchema,
  updateAssignmentSchema,
  listAssignmentsQuerySchema,
  submitAssignmentSchema,
  updateSubmissionSchema,
  gradeSubmissionSchema,
  getMyAssignmentsQuerySchema,
  getSubmissionsQuerySchema,
  assignmentAnalyticsQuerySchema,

  // Export enums
  ASSIGNMENT_TYPES,
  ASSIGNMENT_STATUS,
  SUBMISSION_STATUS
};
