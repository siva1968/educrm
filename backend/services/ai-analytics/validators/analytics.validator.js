const Joi = require('joi');

/**
 * AI Analytics Validation Schemas
 */

// Predict student performance schema
const predictStudentPerformanceSchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  school_id: Joi.string().uuid().required(),
  subject_id: Joi.string().uuid(),
  academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/).required(),
  term: Joi.string(),
  prediction_type: Joi.string().valid(
    'final_grade', 'dropout_risk', 'performance_trend', 'subject_strength', 'improvement_areas'
  ).default('final_grade')
});

// Detect anomalies schema
const detectAnomaliesSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  entity_type: Joi.string().valid('student', 'class', 'teacher', 'subject', 'attendance').required(),
  entity_id: Joi.string().uuid(),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')),
  sensitivity: Joi.number().min(0.1).max(3).default(2) // Standard deviations
});

// Forecast enrollment schema
const forecastEnrollmentSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/).required(),
  class_level: Joi.string().max(10),
  forecast_period: Joi.string().valid('monthly', 'quarterly', 'annual').default('annual')
});

// Generate recommendation schema
const generateRecommendationSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  target_type: Joi.string().valid('student', 'teacher', 'admin', 'parent', 'class').required(),
  target_id: Joi.string().uuid().required(),
  based_on: Joi.array().items(Joi.string()).default(['predictions', 'anomalies', 'performance'])
});

// List predictions query schema
const listPredictionsQuerySchema = Joi.object({
  student_id: Joi.string().uuid(),
  school_id: Joi.string().uuid().required(),
  prediction_type: Joi.string().valid(
    'final_grade', 'dropout_risk', 'performance_trend', 'subject_strength', 'improvement_areas'
  ),
  subject_id: Joi.string().uuid(),
  academic_year: Joi.string(),
  min_confidence: Joi.number().min(0).max(1),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// List anomalies query schema
const listAnomaliesQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  entity_type: Joi.string().valid('student', 'class', 'teacher', 'subject', 'attendance'),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical'),
  status: Joi.string().valid('open', 'acknowledged', 'investigating', 'resolved', 'false_positive'),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Update anomaly status schema
const updateAnomalyStatusSchema = Joi.object({
  status: Joi.string().valid('acknowledged', 'investigating', 'resolved', 'false_positive').required(),
  assigned_to: Joi.string().uuid(),
  resolution_notes: Joi.string()
});

// List recommendations query schema
const listRecommendationsQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  target_type: Joi.string().valid('student', 'teacher', 'admin', 'parent', 'class'),
  target_id: Joi.string().uuid(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  status: Joi.string().valid('pending', 'accepted', 'rejected', 'implemented', 'expired'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

module.exports = {
  predictStudentPerformanceSchema,
  detectAnomaliesSchema,
  forecastEnrollmentSchema,
  generateRecommendationSchema,
  listPredictionsQuerySchema,
  listAnomaliesQuerySchema,
  updateAnomalyStatusSchema,
  listRecommendationsQuerySchema
};
