const Joi = require('joi');

const userSessionSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  user_id: Joi.string().uuid().required(),
  user_role: Joi.string().valid('Student', 'Parent', 'Teacher', 'Admin', 'Principal', 'Staff', 'Super Admin').required(),
  user_name: Joi.string().max(255).optional(),
  ip_address: Joi.string().ip().optional(),
  device_type: Joi.string().valid('Desktop', 'Tablet', 'Mobile', 'Unknown').optional(),
  device_name: Joi.string().max(255).optional(),
  browser_name: Joi.string().max(100).optional(),
  browser_version: Joi.string().max(50).optional(),
  browser_agent: Joi.string().optional(),
  operating_system: Joi.string().max(100).optional(),
  platform: Joi.string().valid('Web', 'Android', 'iOS', 'Desktop App').default('Web'),
  country: Joi.string().max(100).optional(),
  city: Joi.string().max(100).optional(),
  timezone: Joi.string().max(50).optional(),
});

const endSessionSchema = Joi.object({
  session_id: Joi.string().uuid().required(),
  logout_type: Joi.string().valid('Manual', 'Auto', 'Timeout', 'Force Logout').default('Manual'),
});

const activityLogSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  user_id: Joi.string().uuid().required(),
  session_id: Joi.string().uuid().optional(),
  user_role: Joi.string().valid('Student', 'Parent', 'Teacher', 'Admin', 'Principal', 'Staff', 'Super Admin').required(),
  activity_type: Joi.string().valid('View', 'Create', 'Update', 'Delete', 'Export', 'Import', 'Download', 'Upload', 'Login', 'Logout', 'Search', 'Filter', 'Print').required(),
  activity_module: Joi.string().max(100).required(),
  activity_description: Joi.string().optional(),
  resource_id: Joi.string().max(100).optional(),
  resource_type: Joi.string().max(100).optional(),
  resource_name: Joi.string().max(255).optional(),
  http_method: Joi.string().valid('GET', 'POST', 'PUT', 'PATCH', 'DELETE').optional(),
  endpoint_url: Joi.string().optional(),
  request_params: Joi.object().optional(),
  response_time_ms: Joi.number().integer().min(0).optional(),
  status: Joi.string().valid('Success', 'Failed', 'Error', 'Unauthorized', 'Forbidden').default('Success'),
  status_code: Joi.number().integer().optional(),
  error_message: Joi.string().optional(),
  ip_address: Joi.string().ip().optional(),
  metadata: Joi.object().optional(),
});

const analyticsQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  from_date: Joi.date().optional(),
  to_date: Joi.date().min(Joi.ref('from_date')).optional(),
  user_id: Joi.string().uuid().optional(),
  user_role: Joi.string().optional(),
  granularity: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').default('daily'),
});

module.exports = {
  userSessionSchema,
  endSessionSchema,
  activityLogSchema,
  analyticsQuerySchema,
};
