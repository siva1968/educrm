const dashboardService = require('../services/dashboard.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  createDashboardSchema,
  updateDashboardSchema,
  listDashboardsQuerySchema,
  getDashboardDataSchema
} = require('../validators/dashboard.validator');

/**
 * Dashboard Controller
 * Handles HTTP requests for dashboards and widgets
 */

class DashboardController {
  /**
   * Create dashboard
   * POST /api/v1/bi/dashboards
   */
  async createDashboard(req, res, next) {
    try {
      const { error, value } = createDashboardSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const dashboard = await dashboardService.createDashboard(value, userId);

      return ApiResponse.success(res, dashboard, 'Dashboard created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard by ID
   * GET /api/v1/bi/dashboards/:id
   */
  async getDashboard(req, res, next) {
    try {
      const dashboard = await dashboardService.getDashboard(req.params.id);
      return ApiResponse.success(res, dashboard);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List dashboards
   * GET /api/v1/bi/dashboards
   */
  async listDashboards(req, res, next) {
    try {
      const { error, value } = listDashboardsQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await dashboardService.listDashboards(value);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update dashboard
   * PUT /api/v1/bi/dashboards/:id
   */
  async updateDashboard(req, res, next) {
    try {
      const { error, value } = updateDashboardSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const dashboard = await dashboardService.updateDashboard(req.params.id, value, userId);

      return ApiResponse.success(res, dashboard, 'Dashboard updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete dashboard
   * DELETE /api/v1/bi/dashboards/:id
   */
  async deleteDashboard(req, res, next) {
    try {
      const userId = req.user.userId;
      const result = await dashboardService.deleteDashboard(req.params.id, userId);

      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard data with all widget values
   * GET /api/v1/bi/dashboards/:id/data
   */
  async getDashboardData(req, res, next) {
    try {
      const { error, value } = getDashboardDataSchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const dashboardData = await dashboardService.getDashboardData(req.params.id, value);
      return ApiResponse.success(res, dashboardData);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
