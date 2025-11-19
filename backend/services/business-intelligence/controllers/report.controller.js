const reportService = require('../services/report.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  createReportSchema,
  updateReportSchema,
  generateReportSchema,
  listReportsQuerySchema,
  reportExecutionQuerySchema
} = require('../validators/report.validator');
const pool = require('../../../shared/config/database');
const fs = require('fs');
const { NotFoundError } = require('../../../shared/utils/errors');

/**
 * Report Controller
 * Handles HTTP requests for reports
 */

class ReportController {
  /**
   * Create report
   * POST /api/v1/bi/reports
   */
  async createReport(req, res, next) {
    try {
      const { error, value } = createReportSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const report = await reportService.createReport(value, userId);

      return ApiResponse.success(res, report, 'Report created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get report by ID
   * GET /api/v1/bi/reports/:id
   */
  async getReport(req, res, next) {
    try {
      const report = await reportService.getReport(req.params.id);
      return ApiResponse.success(res, report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List reports
   * GET /api/v1/bi/reports
   */
  async listReports(req, res, next) {
    try {
      const { error, value } = listReportsQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await reportService.listReports(value);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update report
   * PUT /api/v1/bi/reports/:id
   */
  async updateReport(req, res, next) {
    try {
      const { error, value } = updateReportSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const report = await reportService.updateReport(req.params.id, value, userId);

      return ApiResponse.success(res, report, 'Report updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete report
   * DELETE /api/v1/bi/reports/:id
   */
  async deleteReport(req, res, next) {
    try {
      const result = await reportService.deleteReport(req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate report
   * POST /api/v1/bi/reports/:id/generate
   */
  async generateReport(req, res, next) {
    try {
      const { error, value } = generateReportSchema.validate({
        report_id: req.params.id,
        ...req.body
      });
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const result = await reportService.generateReport(req.params.id, {
        ...value,
        userId
      });

      return ApiResponse.success(res, result, 'Report generated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get report executions
   * GET /api/v1/bi/reports/executions
   */
  async getReportExecutions(req, res, next) {
    try {
      const { error, value } = reportExecutionQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await reportService.getReportExecutions(value);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download report file
   * GET /api/v1/bi/reports/executions/:id/download
   */
  async downloadReport(req, res, next) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT file_url, status FROM analytics.report_executions WHERE execution_id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Report execution not found');
      }

      const execution = result.rows[0];

      if (execution.status !== 'success') {
        return ApiResponse.error(res, 'Report generation not completed', 400);
      }

      const filePath = execution.file_url;

      if (!fs.existsSync(filePath)) {
        return ApiResponse.error(res, 'Report file not found', 404);
      }

      res.download(filePath);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();
