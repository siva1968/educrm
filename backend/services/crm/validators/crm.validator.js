const Joi = require('joi');

/**
 * CRM Validators
 * Validation schemas for leads, activities, campaigns, and pipeline
 */

// =============================================
// LEAD SCHEMAS
// =============================================

const createLeadSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  first_name: Joi.string().max(100).required(),
  last_name: Joi.string().max(100).required(),
  email: Joi.string().email().max(255),
  phone: Joi.string().max(20),
  parent_name: Joi.string().max(200),
  parent_email: Joi.string().email().max(255),
  parent_phone: Joi.string().max(20),
  student_grade_level: Joi.string().max(10),
  source: Joi.string().max(50),
  status: Joi.string().valid(
    'new', 'contacted', 'qualified', 'application', 'enrolled', 'lost', 'nurturing'
  ).default('new'),
  assigned_to: Joi.string().uuid(),
  notes: Joi.string().allow(''),
  metadata: Joi.object().default({})
});

const updateLeadSchema = Joi.object({
  first_name: Joi.string().max(100),
  last_name: Joi.string().max(100),
  email: Joi.string().email().max(255),
  phone: Joi.string().max(20),
  parent_name: Joi.string().max(200),
  parent_email: Joi.string().email().max(255),
  parent_phone: Joi.string().max(20),
  student_grade_level: Joi.string().max(10),
  source: Joi.string().max(50),
  status: Joi.string().valid(
    'new', 'contacted', 'qualified', 'application', 'enrolled', 'lost', 'nurturing'
  ),
  assigned_to: Joi.string().uuid().allow(null),
  notes: Joi.string().allow(''),
  metadata: Joi.object()
});

const listLeadsQuerySchema = Joi.object({
  school_id: Joi.string().uuid(),
  status: Joi.string().valid(
    'new', 'contacted', 'qualified', 'application', 'enrolled', 'lost', 'nurturing'
  ),
  assigned_to: Joi.string().uuid(),
  source: Joi.string().max(50),
  min_score: Joi.number().integer().min(0).max(100),
  search: Joi.string().max(255), // Search by name or email
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// =============================================
// LEAD ACTIVITY SCHEMAS
// =============================================

const createActivitySchema = Joi.object({
  lead_id: Joi.string().uuid().required(),
  activity_type: Joi.string().valid(
    'call', 'email', 'meeting', 'note', 'status_change', 'tour', 'application_submitted'
  ).required(),
  subject: Joi.string().max(255),
  description: Joi.string(),
  activity_date: Joi.date().iso(),
  metadata: Joi.object().default({})
});

const listActivitiesQuerySchema = Joi.object({
  lead_id: Joi.string().uuid(),
  activity_type: Joi.string().valid(
    'call', 'email', 'meeting', 'note', 'status_change', 'tour', 'application_submitted'
  ),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// =============================================
// PIPELINE STAGE SCHEMAS
// =============================================

const createStageSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  stage_name: Joi.string().max(100).required(),
  stage_order: Joi.number().integer().min(1).required(),
  conversion_probability: Joi.number().min(0).max(100),
  is_active: Joi.boolean().default(true)
});

const updateStageSchema = Joi.object({
  stage_name: Joi.string().max(100),
  stage_order: Joi.number().integer().min(1),
  conversion_probability: Joi.number().min(0).max(100),
  is_active: Joi.boolean()
});

// =============================================
// CAMPAIGN SCHEMAS
// =============================================

const createCampaignSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  campaign_name: Joi.string().max(255).required(),
  description: Joi.string().allow(''),
  campaign_type: Joi.string().max(50),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  budget: Joi.number().min(0),
  status: Joi.string().valid('planned', 'active', 'paused', 'completed', 'cancelled').default('planned'),
  metrics: Joi.object().default({})
});

const updateCampaignSchema = Joi.object({
  campaign_name: Joi.string().max(255),
  description: Joi.string().allow(''),
  campaign_type: Joi.string().max(50),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  budget: Joi.number().min(0),
  status: Joi.string().valid('planned', 'active', 'paused', 'completed', 'cancelled'),
  metrics: Joi.object()
});

const listCampaignsQuerySchema = Joi.object({
  school_id: Joi.string().uuid(),
  status: Joi.string().valid('planned', 'active', 'paused', 'completed', 'cancelled'),
  campaign_type: Joi.string().max(50),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  listLeadsQuerySchema,
  createActivitySchema,
  listActivitiesQuerySchema,
  createStageSchema,
  updateStageSchema,
  createCampaignSchema,
  updateCampaignSchema,
  listCampaignsQuerySchema
};
