const reportCardService = require('../services/reportcard.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  generateReportCardSchema,
  updateReportCardSchema,
  publishReportCardSchema,
  listReportCardsQuerySchema,
  getStudentReportCardsQuerySchema,
  bulkGenerateReportCardsSchema
} = require('../validators/reportcard.validator');

/**
 * Report Card Controller
 * Handles HTTP requests for report card generation and management
 */

class ReportCardController {
  /**
   * Generate report card
   * POST /api/v1/gradebook/report-cards/generate
   */
  async generateReportCard(req, res, next) {
    try {
      const { error, value } = generateReportCardSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;

      const reportCard = await reportCardService.generateReportCard(value, userId);

      return ApiResponse.success(
        res,
        reportCard,
        'Report card generated successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get report card by ID
   * GET /api/v1/gradebook/report-cards/:id
   */
  async getReportCard(req, res, next) {
    try {
      const reportCard = await reportCardService.getReportCardById(req.params.id);

      return ApiResponse.success(res, reportCard);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update report card
   * PUT /api/v1/gradebook/report-cards/:id
   */
  async updateReportCard(req, res, next) {
    try {
      const { error, value } = updateReportCardSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;

      const reportCard = await reportCardService.updateReportCard(
        req.params.id,
        value,
        userId
      );

      return ApiResponse.success(res, reportCard, 'Report card updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Publish report card
   * POST /api/v1/gradebook/report-cards/:id/publish
   */
  async publishReportCard(req, res, next) {
    try {
      const { error, value } = publishReportCardSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;

      const reportCard = await reportCardService.publishReportCard(
        req.params.id,
        value,
        userId
      );

      return ApiResponse.success(res, reportCard, 'Report card published successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete report card
   * DELETE /api/v1/gradebook/report-cards/:id
   */
  async deleteReportCard(req, res, next) {
    try {
      const userId = req.user.userId;

      const result = await reportCardService.deleteReportCard(req.params.id, userId);

      return ApiResponse.success(res, result, 'Report card deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * List report cards
   * GET /api/v1/gradebook/report-cards
   */
  async listReportCards(req, res, next) {
    try {
      const { error, value } = listReportCardsQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await reportCardService.listReportCards(value);

      return ApiResponse.paginated(
        res,
        result.report_cards,
        result.pagination,
        'Report cards retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student's report cards
   * GET /api/v1/gradebook/students/:studentId/report-cards
   */
  async getStudentReportCards(req, res, next) {
    try {
      const filters = {
        student_id: req.params.studentId,
        academic_year: req.query.academic_year,
        term: req.query.term
      };

      const { error, value } = getStudentReportCardsQuerySchema.validate(filters);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const reportCards = await reportCardService.getStudentReportCards(value);

      return ApiResponse.success(
        res,
        reportCards,
        'Student report cards retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk generate report cards for a class
   * POST /api/v1/gradebook/report-cards/bulk-generate
   */
  async bulkGenerateReportCards(req, res, next) {
    try {
      const { error, value } = bulkGenerateReportCardsSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;

      const result = await reportCardService.bulkGenerateReportCards(value, userId);

      return ApiResponse.success(
        res,
        result,
        'Bulk report card generation completed',
        201
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportCardController();
