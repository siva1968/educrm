const Joi = require('joi');

/**
 * Report Validation Schemas
 * Business Intelligence Service
 */

// Report schedule schema
const scheduleSchema = Joi.object({
  frequency: Joi.string().valid('daily', 'weekly', 'monthly').required(),
  time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(), // HH:MM format
  daysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6)).when('frequency', {
    is: 'weekly',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  dayOfMonth: Joi.number().integer().min(1).max(31).when('frequency', {
    is: 'monthly',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  timezone: Joi.string().default('Asia/Kolkata')
});

// Query configuration schema
const queryConfigSchema = Joi.object({
  source: Joi.string().valid(
    'attendance', 'grades', 'examinations', 'assignments', 'subjects',
    'students', 'teachers', 'fees', 'custom_query'
  ).required(),
  filters: Joi.object().default({}),
  columns: Joi.array().items(Joi.string()).required(),
  aggregations: Joi.array().items(Joi.object({
    field: Joi.string().required(),
    function: Joi.string().valid('count', 'sum', 'avg', 'min', 'max').required(),
    alias: Joi.string()
  })).default([]),
  groupBy: Joi.array().items(Joi.string()).default([]),
  orderBy: Joi.array().items(Joi.object({
    field: Joi.string().required(),
    direction: Joi.string().valid('asc', 'desc').default('asc')
  })).default([]),
  limit: Joi.number().integer().min(1).max(10000).default(1000),
  customQuery: Joi.string().when('source', {
    is: 'custom_query',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  })
});

// Create report schema
const createReportSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  report_name: Joi.string().max(255).required(),
  report_category: Joi.string().valid(
    'academic', 'attendance', 'examination', 'assignment', 'financial',
    'hr', 'administrative', 'compliance', 'custom'
  ).required(),
  description: Joi.string().allow('', null),
  query_config: queryConfigSchema.required(),
  parameters: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('text', 'number', 'date', 'select', 'multiselect').required(),
    label: Joi.string().required(),
    required: Joi.boolean().default(false),
    default_value: Joi.any(),
    options: Joi.array().when('type', {
      is: Joi.string().valid('select', 'multiselect'),
      then: Joi.required(),
      otherwise: Joi.forbidden()
    })
  })).default([]),
  schedule: scheduleSchema.allow(null),
  output_format: Joi.string().valid('pdf', 'excel', 'csv', 'html', 'json').default('pdf'),
  recipients: Joi.array().items(Joi.string().email()).default([]),
  is_scheduled: Joi.boolean().default(false),
  is_active: Joi.boolean().default(true)
});

// Update report schema
const updateReportSchema = Joi.object({
  report_name: Joi.string().max(255),
  description: Joi.string().allow('', null),
  query_config: queryConfigSchema,
  parameters: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('text', 'number', 'date', 'select', 'multiselect').required(),
    label: Joi.string().required(),
    required: Joi.boolean().default(false),
    default_value: Joi.any(),
    options: Joi.array()
  })),
  schedule: scheduleSchema.allow(null),
  output_format: Joi.string().valid('pdf', 'excel', 'csv', 'html', 'json'),
  recipients: Joi.array().items(Joi.string().email()),
  is_scheduled: Joi.boolean(),
  is_active: Joi.boolean()
}).min(1);

// Generate report schema
const generateReportSchema = Joi.object({
  report_id: Joi.string().uuid().required(),
  parameters: Joi.object().default({}),
  output_format: Joi.string().valid('pdf', 'excel', 'csv', 'html', 'json'),
  email_to: Joi.array().items(Joi.string().email()).default([])
});

// List reports query schema
const listReportsQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  report_category: Joi.string().valid(
    'academic', 'attendance', 'examination', 'assignment', 'financial',
    'hr', 'administrative', 'compliance', 'custom'
  ),
  is_scheduled: Joi.boolean(),
  is_active: Joi.boolean(),
  search: Joi.string().max(255),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Report execution query schema
const reportExecutionQuerySchema = Joi.object({
  report_id: Joi.string().uuid(),
  status: Joi.string().valid('running', 'success', 'failed', 'cancelled'),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

module.exports = {
  createReportSchema,
  updateReportSchema,
  generateReportSchema,
  listReportsQuerySchema,
  reportExecutionQuerySchema
};
