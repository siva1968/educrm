const Joi = require('joi');

/**
 * Grade Book Validators
 * Validates input for gradebook operations including assessments, grades, and report cards
 */

// Enums
const ASSESSMENT_TYPES = ['Quiz', 'Test', 'Mid-term', 'Final', 'Project', 'Assignment', 'Practical', 'Oral'];
const ASSESSMENT_STATUS = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
const REPORT_CARD_STATUS = ['Draft', 'Published', 'Archived'];
const GRADING_SCALES = ['CBSE', 'ICSE', 'Cambridge', 'IB', 'Percentage'];

// Create Assessment Schema
const createAssessmentSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  subject_id: Joi.string().uuid().required(),
  assessment_type: Joi.string().valid(...ASSESSMENT_TYPES).required(),
  assessment_name: Joi.string().max(200).required(),
  class: Joi.string().max(10).required(),
  section: Joi.string().max(10).allow(null, ''),
  total_marks: Joi.number().min(1).max(1000).required(),
  passing_marks: Joi.number().min(0).max(1000),
  weightage: Joi.number().min(0).max(100).default(0),
  scheduled_date: Joi.date().iso().required(),
  duration_minutes: Joi.number().min(1).max(600),
  instructions: Joi.string().allow(null, ''),
  grading_scale: Joi.string().valid(...GRADING_SCALES).default('Percentage'),
  status: Joi.string().valid(...ASSESSMENT_STATUS).default('Scheduled')
});

// Update Assessment Schema
const updateAssessmentSchema = Joi.object({
  assessment_type: Joi.string().valid(...ASSESSMENT_TYPES),
  assessment_name: Joi.string().max(200),
  total_marks: Joi.number().min(1).max(1000),
  passing_marks: Joi.number().min(0).max(1000),
  weightage: Joi.number().min(0).max(100),
  scheduled_date: Joi.date().iso(),
  duration_minutes: Joi.number().min(1).max(600),
  instructions: Joi.string().allow(null, ''),
  grading_scale: Joi.string().valid(...GRADING_SCALES),
  status: Joi.string().valid(...ASSESSMENT_STATUS)
}).min(1);

// List Assessments Query Schema
const listAssessmentsQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  subject_id: Joi.string().uuid(),
  class: Joi.string().max(10),
  section: Joi.string().max(10),
  assessment_type: Joi.string().valid(...ASSESSMENT_TYPES),
  status: Joi.string().valid(...ASSESSMENT_STATUS),
  from_date: Joi.date().iso(),
  to_date: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Record Grade Schema
const recordGradeSchema = Joi.object({
  assessment_id: Joi.string().uuid().required(),
  student_id: Joi.string().uuid().required(),
  marks_obtained: Joi.number().min(0).required(),
  is_absent: Joi.boolean().default(false),
  remarks: Joi.string().max(500).allow(null, '')
});

// Batch Record Grades Schema
const batchRecordGradesSchema = Joi.object({
  assessment_id: Joi.string().uuid().required(),
  grades: Joi.array().items(
    Joi.object({
      student_id: Joi.string().uuid().required(),
      marks_obtained: Joi.number().min(0).required(),
      is_absent: Joi.boolean().default(false),
      remarks: Joi.string().max(500).allow(null, '')
    })
  ).min(1).max(200).required()
});

// Update Grade Schema
const updateGradeSchema = Joi.object({
  marks_obtained: Joi.number().min(0),
  is_absent: Joi.boolean(),
  remarks: Joi.string().max(500).allow(null, '')
}).min(1);

// Generate Report Card Schema
const generateReportCardSchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  class: Joi.string().max(10).required(),
  section: Joi.string().max(10).allow(null, ''),
  academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/).required(),
  term: Joi.string().valid('Term 1', 'Term 2', 'Annual').required(),
  grading_scale: Joi.string().valid(...GRADING_SCALES).default('Percentage'),
  include_assessments: Joi.array().items(Joi.string().uuid()).allow(null)
});

// Publish Report Card Schema
const publishReportCardSchema = Joi.object({
  report_card_id: Joi.string().uuid().required(),
  published_by: Joi.string().uuid(),
  comments: Joi.string().max(1000).allow(null, '')
});

// Get Student Grades Query Schema
const getStudentGradesQuerySchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  subject_id: Joi.string().uuid(),
  assessment_type: Joi.string().valid(...ASSESSMENT_TYPES),
  from_date: Joi.date().iso(),
  to_date: Joi.date().iso()
});

// Class Performance Query Schema
const classPerformanceQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  class: Joi.string().max(10).required(),
  section: Joi.string().max(10),
  subject_id: Joi.string().uuid(),
  assessment_id: Joi.string().uuid()
});

// Subject Analytics Query Schema
const subjectAnalyticsQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  subject_id: Joi.string().uuid().required(),
  class: Joi.string().max(10),
  academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/),
  assessment_type: Joi.string().valid(...ASSESSMENT_TYPES)
});

module.exports = {
  createAssessmentSchema,
  updateAssessmentSchema,
  listAssessmentsQuerySchema,
  recordGradeSchema,
  batchRecordGradesSchema,
  updateGradeSchema,
  generateReportCardSchema,
  publishReportCardSchema,
  getStudentGradesQuerySchema,
  classPerformanceQuerySchema,
  subjectAnalyticsQuerySchema,

  // Export enums
  ASSESSMENT_TYPES,
  ASSESSMENT_STATUS,
  REPORT_CARD_STATUS,
  GRADING_SCALES
};
