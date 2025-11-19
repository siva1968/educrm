const analyticsService = require('../services/analytics.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  userSessionSchema,
  endSessionSchema,
  activityLogSchema,
  analyticsQuerySchema,
} = require('../validators/analytics.validator');

class AnalyticsController {
  /**
   * Start user session (login)
   */
  async startSession(req, res, next) {
    try {
      const { error, value } = userSessionSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const session = await analyticsService.startSession(value);

      return ApiResponse.created(res, session, 'Session started successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * End user session (logout)
   */
  async endSession(req, res, next) {
    try {
      const { error, value } = endSessionSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const session = await analyticsService.endSession(value.session_id, value.logout_type);

      return ApiResponse.success(res, session, 'Session ended successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log user activity
   */
  async logActivity(req, res, next) {
    try {
      const { error, value } = activityLogSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const activity = await analyticsService.logActivity(value);

      return ApiResponse.created(res, activity, 'Activity logged successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStatistics(req, res, next) {
    try {
      const { error, value } = analyticsQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const stats = await analyticsService.getUsageStatistics(value.school_id, {
        from_date: value.from_date,
        to_date: value.to_date,
        granularity: value.granularity,
      });

      return ApiResponse.success(res, stats, 'Usage statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(req, res, next) {
    try {
      const { school_id } = req.query;

      if (!school_id) {
        return ApiResponse.validationError(res, ['school_id is required']);
      }

      const sessions = await analyticsService.getActiveSessions(school_id);

      return ApiResponse.success(res, sessions, `Found ${sessions.length} active sessions`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagement(req, res, next) {
    try {
      const { school_id, user_id, month_year } = req.query;

      if (!school_id) {
        return ApiResponse.validationError(res, ['school_id is required']);
      }

      const engagement = await analyticsService.getUserEngagement(school_id, {
        user_id,
        month_year,
      });

      return ApiResponse.success(res, engagement, 'User engagement metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get feature usage
   */
  async getFeatureUsage(req, res, next) {
    try {
      const { school_id, from_date, to_date } = req.query;

      if (!school_id || !from_date || !to_date) {
        return ApiResponse.validationError(res, ['school_id, from_date, and to_date are required']);
      }

      const features = await analyticsService.getFeatureUsage(school_id, from_date, to_date);

      return ApiResponse.success(res, features, 'Feature usage retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get API performance metrics
   */
  async getAPIPerformance(req, res, next) {
    try {
      const { from_date, to_date, limit } = req.query;

      if (!from_date || !to_date) {
        return ApiResponse.validationError(res, ['from_date and to_date are required']);
      }

      const performance = await analyticsService.getAPIPerformance(
        from_date,
        to_date,
        limit ? parseInt(limit) : 50
      );

      return ApiResponse.success(res, performance, 'API performance metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboard(req, res, next) {
    try {
      const { school_id, period } = req.query;

      if (!school_id) {
        return ApiResponse.validationError(res, ['school_id is required']);
      }

      const dashboard = await analyticsService.getDashboardData(school_id, period || 'today');

      return ApiResponse.success(res, dashboard, 'Dashboard data retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Trigger statistics aggregation (admin only)
   */
  async aggregateStatistics(req, res, next) {
    try {
      const { school_id, date, hour } = req.body;

      if (!school_id || !date) {
        return ApiResponse.validationError(res, ['school_id and date are required']);
      }

      await analyticsService.aggregateStatistics(school_id, date, hour || null);

      return ApiResponse.success(res, null, 'Statistics aggregated successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
