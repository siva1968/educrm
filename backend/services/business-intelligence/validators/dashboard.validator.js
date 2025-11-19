const Joi = require('joi');

/**
 * Dashboard Validation Schemas
 * Business Intelligence Service
 */

// Widget position schema
const widgetPositionSchema = Joi.object({
  x: Joi.number().integer().min(0).required(),
  y: Joi.number().integer().min(0).required(),
  w: Joi.number().integer().min(1).max(12).required(),
  h: Joi.number().integer().min(1).max(12).required()
});

// Widget configuration schema
const widgetConfigSchema = Joi.object({
  widget_type: Joi.string().valid(
    'kpi_card', 'line_chart', 'bar_chart', 'pie_chart', 'area_chart',
    'table', 'list', 'calendar', 'progress', 'gauge'
  ).required(),
  widget_title: Joi.string().max(255).required(),
  data_source: Joi.string().max(100).required(),
  config: Joi.object().default({}),
  position: widgetPositionSchema.required(),
  refresh_interval: Joi.number().integer().min(0).allow(null).default(300),
  is_visible: Joi.boolean().default(true)
});

// Create dashboard schema
const createDashboardSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  dashboard_name: Joi.string().max(255).required(),
  dashboard_type: Joi.string().valid(
    'principal', 'teacher', 'department', 'class', 'student', 'parent', 'custom'
  ).required(),
  description: Joi.string().allow('', null),
  layout: Joi.array().items(widgetConfigSchema).default([]),
  filters: Joi.object().default({}),
  permissions: Joi.object({
    roles: Joi.array().items(Joi.string()).default(['admin']),
    users: Joi.array().items(Joi.string().uuid()).default([])
  }).default({ roles: ['admin'] }),
  is_default: Joi.boolean().default(false),
  is_active: Joi.boolean().default(true)
});

// Update dashboard schema
const updateDashboardSchema = Joi.object({
  dashboard_name: Joi.string().max(255),
  description: Joi.string().allow('', null),
  layout: Joi.array().items(widgetConfigSchema),
  filters: Joi.object(),
  permissions: Joi.object({
    roles: Joi.array().items(Joi.string()),
    users: Joi.array().items(Joi.string().uuid())
  }),
  is_default: Joi.boolean(),
  is_active: Joi.boolean()
}).min(1);

// Add widget to dashboard schema
const addWidgetSchema = Joi.object({
  dashboard_id: Joi.string().uuid().required(),
  widget_type: Joi.string().valid(
    'kpi_card', 'line_chart', 'bar_chart', 'pie_chart', 'area_chart',
    'table', 'list', 'calendar', 'progress', 'gauge'
  ).required(),
  widget_title: Joi.string().max(255).required(),
  data_source: Joi.string().max(100).required(),
  config: Joi.object().required(),
  position: widgetPositionSchema.required(),
  refresh_interval: Joi.number().integer().min(0).allow(null).default(300),
  is_visible: Joi.boolean().default(true)
});

// Update widget schema
const updateWidgetSchema = Joi.object({
  widget_title: Joi.string().max(255),
  config: Joi.object(),
  position: widgetPositionSchema,
  refresh_interval: Joi.number().integer().min(0).allow(null),
  is_visible: Joi.boolean()
}).min(1);

// List dashboards query schema
const listDashboardsQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  dashboard_type: Joi.string().valid(
    'principal', 'teacher', 'department', 'class', 'student', 'parent', 'custom'
  ),
  is_active: Joi.boolean(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Get dashboard data query schema
const getDashboardDataSchema = Joi.object({
  filters: Joi.object().default({}),
  date_range: Joi.object({
    start_date: Joi.date().iso(),
    end_date: Joi.date().iso().min(Joi.ref('start_date'))
  }),
  refresh: Joi.boolean().default(false) // Force refresh cache
});

module.exports = {
  createDashboardSchema,
  updateDashboardSchema,
  addWidgetSchema,
  updateWidgetSchema,
  listDashboardsQuerySchema,
  getDashboardDataSchema
};
