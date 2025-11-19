const crmService = require('../services/crm.service');
const ApiResponse = require('../../../shared/utils/response');
const {
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
} = require('../validators/crm.validator');

/**
 * CRM Controller
 * Handles HTTP requests for CRM operations
 */

class CRMController {
  // =============================================
  // LEADS
  // =============================================

  /**
   * Create lead
   * POST /api/v1/crm/leads
   */
  async createLead(req, res, next) {
    try {
      const { error, value } = createLeadSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const lead = await crmService.createLead(value, userId);

      return ApiResponse.success(res, lead, 'Lead created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get lead by ID
   * GET /api/v1/crm/leads/:id
   */
  async getLead(req, res, next) {
    try {
      const lead = await crmService.getLead(req.params.id);
      return ApiResponse.success(res, lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List leads
   * GET /api/v1/crm/leads
   */
  async listLeads(req, res, next) {
    try {
      const { error, value } = listLeadsQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await crmService.listLeads(value);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update lead
   * PUT /api/v1/crm/leads/:id
   */
  async updateLead(req, res, next) {
    try {
      const { error, value } = updateLeadSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const lead = await crmService.updateLead(req.params.id, value, userId);

      return ApiResponse.success(res, lead, 'Lead updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete lead
   * DELETE /api/v1/crm/leads/:id
   */
  async deleteLead(req, res, next) {
    try {
      const result = await crmService.deleteLead(req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // =============================================
  // LEAD ACTIVITIES
  // =============================================

  /**
   * Create activity
   * POST /api/v1/crm/activities
   */
  async createActivity(req, res, next) {
    try {
      const { error, value } = createActivitySchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const activity = await crmService.createActivity(value, userId);

      return ApiResponse.success(res, activity, 'Activity logged successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get lead activities
   * GET /api/v1/crm/leads/:id/activities
   */
  async getLeadActivities(req, res, next) {
    try {
      const { error, value } = listActivitiesQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await crmService.getLeadActivities(req.params.id, value);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // =============================================
  // PIPELINE STAGES
  // =============================================

  /**
   * Create pipeline stage
   * POST /api/v1/crm/stages
   */
  async createStage(req, res, next) {
    try {
      const { error, value } = createStageSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const stage = await crmService.createStage(value);
      return ApiResponse.success(res, stage, 'Pipeline stage created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pipeline stages
   * GET /api/v1/crm/stages
   */
  async getStages(req, res, next) {
    try {
      const { school_id } = req.query;

      if (!school_id) {
        return ApiResponse.error(res, 'school_id is required', 400);
      }

      const stages = await crmService.getStages(school_id);
      return ApiResponse.success(res, stages);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update pipeline stage
   * PUT /api/v1/crm/stages/:id
   */
  async updateStage(req, res, next) {
    try {
      const { error, value } = updateStageSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const stage = await crmService.updateStage(req.params.id, value);
      return ApiResponse.success(res, stage, 'Pipeline stage updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete pipeline stage
   * DELETE /api/v1/crm/stages/:id
   */
  async deleteStage(req, res, next) {
    try {
      const result = await crmService.deleteStage(req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // =============================================
  // CAMPAIGNS
  // =============================================

  /**
   * Create campaign
   * POST /api/v1/crm/campaigns
   */
  async createCampaign(req, res, next) {
    try {
      const { error, value } = createCampaignSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const campaign = await crmService.createCampaign(value, userId);

      return ApiResponse.success(res, campaign, 'Campaign created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get campaign by ID
   * GET /api/v1/crm/campaigns/:id
   */
  async getCampaign(req, res, next) {
    try {
      const campaign = await crmService.getCampaign(req.params.id);
      return ApiResponse.success(res, campaign);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List campaigns
   * GET /api/v1/crm/campaigns
   */
  async listCampaigns(req, res, next) {
    try {
      const { error, value } = listCampaignsQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await crmService.listCampaigns(value);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update campaign
   * PUT /api/v1/crm/campaigns/:id
   */
  async updateCampaign(req, res, next) {
    try {
      const { error, value } = updateCampaignSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const campaign = await crmService.updateCampaign(req.params.id, value);
      return ApiResponse.success(res, campaign, 'Campaign updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete campaign
   * DELETE /api/v1/crm/campaigns/:id
   */
  async deleteCampaign(req, res, next) {
    try {
      const result = await crmService.deleteCampaign(req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // =============================================
  // ANALYTICS
  // =============================================

  /**
   * Get CRM dashboard metrics
   * GET /api/v1/crm/metrics
   */
  async getDashboardMetrics(req, res, next) {
    try {
      const { school_id } = req.query;

      if (!school_id) {
        return ApiResponse.error(res, 'school_id is required', 400);
      }

      const metrics = await crmService.getDashboardMetrics(school_id);
      return ApiResponse.success(res, metrics);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CRMController();
