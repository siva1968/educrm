const Joi = require('joi');

/**
 * KPI Validation Schemas
 * Business Intelligence Service
 */

// Create KPI definition schema
const createKPISchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  kpi_name: Joi.string().max(255).required(),
  kpi_category: Joi.string().valid(
    'academic', 'attendance', 'examination', 'financial', 'hr', 'operational', 'compliance'
  ).required(),
  description: Joi.string().allow('', null),
  calculation_logic: Joi.object({
    formula: Joi.string(),
    source: Joi.string().valid(
      'attendance', 'grades', 'examinations', 'assignments', 'fees', 'custom_query'
    ).required(),
    query: Joi.object(),
    aggregation: Joi.string().valid('count', 'sum', 'avg', 'min', 'max', 'percentage').required()
  }).required(),
  unit: Joi.string().max(20).allow('', null),
  target_value: Joi.number().allow(null),
  thresholds: Joi.object({
    critical: Joi.number().required(),
    warning: Joi.number().required(),
    good: Joi.number().required(),
    excellent: Joi.number().required()
  }).allow(null),
  refresh_frequency: Joi.string().valid('real_time', 'hourly', 'daily', 'weekly', 'monthly').default('daily'),
  is_active: Joi.boolean().default(true)
});

// Update KPI definition schema
const updateKPISchema = Joi.object({
  kpi_name: Joi.string().max(255),
  description: Joi.string().allow('', null),
  calculation_logic: Joi.object({
    formula: Joi.string(),
    source: Joi.string(),
    query: Joi.object(),
    aggregation: Joi.string().valid('count', 'sum', 'avg', 'min', 'max', 'percentage')
  }),
  unit: Joi.string().max(20).allow('', null),
  target_value: Joi.number().allow(null),
  thresholds: Joi.object({
    critical: Joi.number().required(),
    warning: Joi.number().required(),
    good: Joi.number().required(),
    excellent: Joi.number().required()
  }).allow(null),
  refresh_frequency: Joi.string().valid('real_time', 'hourly', 'daily', 'weekly', 'monthly'),
  is_active: Joi.boolean()
}).min(1);

// Calculate KPI value schema
const calculateKPISchema = Joi.object({
  kpi_id: Joi.string().uuid().required(),
  period_type: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly').required(),
  period_start: Joi.date().iso().required(),
  period_end: Joi.date().iso().min(Joi.ref('period_start')).required(),
  force_refresh: Joi.boolean().default(false)
});

// Get KPI values query schema
const getKPIValuesQuerySchema = Joi.object({
  kpi_id: Joi.string().uuid(),
  period_type: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')),
  status: Joi.string().valid('critical', 'warning', 'good', 'excellent'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// List KPIs query schema
const listKPIsQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  kpi_category: Joi.string().valid(
    'academic', 'attendance', 'examination', 'financial', 'hr', 'operational', 'compliance'
  ),
  is_active: Joi.boolean(),
  search: Joi.string().max(255),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

module.exports = {
  createKPISchema,
  updateKPISchema,
  calculateKPISchema,
  getKPIValuesQuerySchema,
  listKPIsQuerySchema
};
