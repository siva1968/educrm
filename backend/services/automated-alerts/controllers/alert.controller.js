const alertService = require('../services/alert.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  createAlertRuleSchema,
  updateAlertRuleSchema,
  triggerAlertSchema,
  updateAlertInstanceSchema,
  listAlertRulesQuerySchema,
  listAlertInstancesQuerySchema,
  createSubscriptionSchema,
  updateSubscriptionSchema
} = require('../validators/alert.validator');

/**
 * Alert Controller
 * Handles HTTP requests for alert operations
 */

class AlertController {
  // =============================================
  // ALERT RULES
  // =============================================

  /**
   * Create alert rule
   * POST /api/v1/alerts/rules
   */
  async createAlertRule(req, res, next) {
    try {
      const { error, value } = createAlertRuleSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const rule = await alertService.createAlertRule(value, userId);

      return ApiResponse.success(res, rule, 'Alert rule created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get alert rule by ID
   * GET /api/v1/alerts/rules/:id
   */
  async getAlertRule(req, res, next) {
    try {
      const rule = await alertService.getAlertRule(req.params.id);
      return ApiResponse.success(res, rule);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List alert rules
   * GET /api/v1/alerts/rules
   */
  async listAlertRules(req, res, next) {
    try {
      const { error, value } = listAlertRulesQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await alertService.listAlertRules(value);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update alert rule
   * PUT /api/v1/alerts/rules/:id
   */
  async updateAlertRule(req, res, next) {
    try {
      const { error, value } = updateAlertRuleSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const rule = await alertService.updateAlertRule(req.params.id, value, userId);

      return ApiResponse.success(res, rule, 'Alert rule updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete alert rule
   * DELETE /api/v1/alerts/rules/:id
   */
  async deleteAlertRule(req, res, next) {
    try {
      const result = await alertService.deleteAlertRule(req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // =============================================
  // ALERT INSTANCES
  // =============================================

  /**
   * Trigger alert
   * POST /api/v1/alerts/instances/trigger
   */
  async triggerAlert(req, res, next) {
    try {
      const { error, value } = triggerAlertSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const instance = await alertService.triggerAlert(value);
      return ApiResponse.success(res, instance, 'Alert triggered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get alert instance by ID
   * GET /api/v1/alerts/instances/:id
   */
  async getAlertInstance(req, res, next) {
    try {
      const instance = await alertService.getAlertInstance(req.params.id);
      return ApiResponse.success(res, instance);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List alert instances
   * GET /api/v1/alerts/instances
   */
  async listAlertInstances(req, res, next) {
    try {
      const { error, value } = listAlertInstancesQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await alertService.listAlertInstances(value);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update alert instance
   * PUT /api/v1/alerts/instances/:id
   */
  async updateAlertInstance(req, res, next) {
    try {
      const { error, value } = updateAlertInstanceSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const instance = await alertService.updateAlertInstance(req.params.id, value, userId);

      return ApiResponse.success(res, instance, 'Alert instance updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // =============================================
  // USER SUBSCRIPTIONS
  // =============================================

  /**
   * Create subscription
   * POST /api/v1/alerts/subscriptions
   */
  async createSubscription(req, res, next) {
    try {
      const { error, value } = createSubscriptionSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const subscription = await alertService.createSubscription(value);
      return ApiResponse.success(res, subscription, 'Subscription created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user subscriptions
   * GET /api/v1/alerts/subscriptions
   */
  async getUserSubscriptions(req, res, next) {
    try {
      const userId = req.user.userId;
      const { school_id } = req.query;

      if (!school_id) {
        return ApiResponse.error(res, 'school_id is required', 400);
      }

      const subscriptions = await alertService.getUserSubscriptions(userId, school_id);
      return ApiResponse.success(res, subscriptions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update subscription
   * PUT /api/v1/alerts/subscriptions/:id
   */
  async updateSubscription(req, res, next) {
    try {
      const { error, value } = updateSubscriptionSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const subscription = await alertService.updateSubscription(req.params.id, value);
      return ApiResponse.success(res, subscription, 'Subscription updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete subscription
   * DELETE /api/v1/alerts/subscriptions/:id
   */
  async deleteSubscription(req, res, next) {
    try {
      const result = await alertService.deleteSubscription(req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // =============================================
  // RULE EVALUATION
  // =============================================

  /**
   * Evaluate alert rules
   * POST /api/v1/alerts/evaluate
   */
  async evaluateRules(req, res, next) {
    try {
      const { school_id } = req.body;

      if (!school_id) {
        return ApiResponse.error(res, 'school_id is required', 400);
      }

      const result = await alertService.evaluateRules(school_id);
      return ApiResponse.success(res, result, 'Alert rules evaluated successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AlertController();
