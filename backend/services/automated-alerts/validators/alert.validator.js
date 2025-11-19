const Joi = require('joi');

/**
 * Alert Validators
 * Validation schemas for alert rules, instances, and subscriptions
 */

// Create Alert Rule
const createAlertRuleSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  rule_name: Joi.string().max(255).required(),
  description: Joi.string().allow(''),
  entity_type: Joi.string().valid(
    'student', 'teacher', 'class', 'attendance', 'fees', 'grades', 'behavior', 'enrollment'
  ).required(),
  condition_type: Joi.string().valid(
    'threshold', 'pattern', 'anomaly', 'schedule', 'trend', 'composite'
  ).required(),
  conditions: Joi.object().required(),
  severity: Joi.string().valid('info', 'warning', 'critical').required(),
  notification_channels: Joi.array().items(
    Joi.string().valid('email', 'sms', 'push', 'in_app')
  ).default(['in_app']),
  recipients: Joi.object({
    roles: Joi.array().items(Joi.string()),
    specific_users: Joi.array().items(Joi.string().uuid())
  }).default({}),
  is_active: Joi.boolean().default(true)
});

// Update Alert Rule
const updateAlertRuleSchema = Joi.object({
  rule_name: Joi.string().max(255),
  description: Joi.string().allow(''),
  condition_type: Joi.string().valid(
    'threshold', 'pattern', 'anomaly', 'schedule', 'trend', 'composite'
  ),
  conditions: Joi.object(),
  severity: Joi.string().valid('info', 'warning', 'critical'),
  notification_channels: Joi.array().items(
    Joi.string().valid('email', 'sms', 'push', 'in_app')
  ),
  recipients: Joi.object({
    roles: Joi.array().items(Joi.string()),
    specific_users: Joi.array().items(Joi.string().uuid())
  }),
  is_active: Joi.boolean()
});

// Trigger Alert
const triggerAlertSchema = Joi.object({
  rule_id: Joi.string().uuid().required(),
  school_id: Joi.string().uuid().required(),
  entity_type: Joi.string().valid(
    'student', 'teacher', 'class', 'attendance', 'fees', 'grades', 'behavior', 'enrollment'
  ).required(),
  entity_id: Joi.string().uuid().required(),
  severity: Joi.string().valid('info', 'warning', 'critical').required(),
  title: Joi.string().max(255).required(),
  message: Joi.string().required(),
  details: Joi.object().default({})
});

// Update Alert Instance
const updateAlertInstanceSchema = Joi.object({
  status: Joi.string().valid('active', 'acknowledged', 'resolved', 'dismissed'),
  resolution_notes: Joi.string().allow('')
});

// List Alert Rules Query
const listAlertRulesQuerySchema = Joi.object({
  school_id: Joi.string().uuid(),
  entity_type: Joi.string().valid(
    'student', 'teacher', 'class', 'attendance', 'fees', 'grades', 'behavior', 'enrollment'
  ),
  is_active: Joi.boolean(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// List Alert Instances Query
const listAlertInstancesQuerySchema = Joi.object({
  school_id: Joi.string().uuid(),
  rule_id: Joi.string().uuid(),
  entity_type: Joi.string().valid(
    'student', 'teacher', 'class', 'attendance', 'fees', 'grades', 'behavior', 'enrollment'
  ),
  entity_id: Joi.string().uuid(),
  severity: Joi.string().valid('info', 'warning', 'critical'),
  status: Joi.string().valid('active', 'acknowledged', 'resolved', 'dismissed'),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Create User Subscription
const createSubscriptionSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  school_id: Joi.string().uuid().required(),
  entity_type: Joi.string().valid(
    'student', 'teacher', 'class', 'attendance', 'fees', 'grades', 'behavior', 'enrollment'
  ),
  entity_id: Joi.string().uuid(),
  alert_severity: Joi.array().items(
    Joi.string().valid('info', 'warning', 'critical')
  ).default(['warning', 'critical']),
  channels: Joi.array().items(
    Joi.string().valid('email', 'sms', 'push', 'in_app')
  ).default(['in_app']),
  is_active: Joi.boolean().default(true)
});

// Update User Subscription
const updateSubscriptionSchema = Joi.object({
  alert_severity: Joi.array().items(
    Joi.string().valid('info', 'warning', 'critical')
  ),
  channels: Joi.array().items(
    Joi.string().valid('email', 'sms', 'push', 'in_app')
  ),
  is_active: Joi.boolean()
});

module.exports = {
  createAlertRuleSchema,
  updateAlertRuleSchema,
  triggerAlertSchema,
  updateAlertInstanceSchema,
  listAlertRulesQuerySchema,
  listAlertInstancesQuerySchema,
  createSubscriptionSchema,
  updateSubscriptionSchema
};
