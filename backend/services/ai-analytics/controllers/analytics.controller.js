const analyticsService = require('../services/analytics.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  predictStudentPerformanceSchema,
  predictDropoutRiskSchema,
  detectAnomaliesSchema,
  forecastEnrollmentSchema,
  generateRecommendationsSchema,
  listPredictionsQuerySchema,
  listAnomaliesQuerySchema,
  updateAnomalySchema,
  listRecommendationsQuerySchema,
  updateRecommendationSchema
} = require('../validators/analytics.validator');

/**
 * Analytics Controller
 * Handles HTTP requests for AI analytics operations
 */

class AnalyticsController {
  /**
   * Predict student performance
   * POST /api/v1/analytics/predictions/student-performance
   */
  async predictStudentPerformance(req, res, next) {
    try {
      const { error, value } = predictStudentPerformanceSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const prediction = await analyticsService.predictStudentPerformance(value);
      return ApiResponse.success(res, prediction, 'Prediction generated successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Predict dropout risk
   * POST /api/v1/analytics/predictions/dropout-risk
   */
  async predictDropoutRisk(req, res, next) {
    try {
      const { error, value } = predictDropoutRiskSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const prediction = await analyticsService.predictDropoutRisk(value);
      return ApiResponse.success(res, prediction, 'Dropout risk assessed successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get predictions
   * GET /api/v1/analytics/predictions
   */
  async getPredictions(req, res, next) {
    try {
      const { error, value } = listPredictionsQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await analyticsService.getPredictions(value);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get prediction by ID
   * GET /api/v1/analytics/predictions/:id
   */
  async getPrediction(req, res, next) {
    try {
      const prediction = await analyticsService.getPrediction(req.params.id);
      return ApiResponse.success(res, prediction);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete prediction
   * DELETE /api/v1/analytics/predictions/:id
   */
  async deletePrediction(req, res, next) {
    try {
      const result = await analyticsService.deletePrediction(req.params.id);
      return ApiResponse.success(res, result, 'Prediction deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Detect anomalies
   * POST /api/v1/analytics/anomalies/detect
   */
  async detectAnomalies(req, res, next) {
    try {
      const { error, value } = detectAnomaliesSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const anomalies = await analyticsService.detectAnomalies(value);
      return ApiResponse.success(res, anomalies, 'Anomaly detection completed', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get anomalies
   * GET /api/v1/analytics/anomalies
   */
  async getAnomalies(req, res, next) {
    try {
      const { error, value } = listAnomaliesQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await analyticsService.getAnomalies(value);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get anomaly by ID
   * GET /api/v1/analytics/anomalies/:id
   */
  async getAnomaly(req, res, next) {
    try {
      const anomaly = await analyticsService.getAnomaly(req.params.id);
      return ApiResponse.success(res, anomaly);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update anomaly
   * PUT /api/v1/analytics/anomalies/:id
   */
  async updateAnomaly(req, res, next) {
    try {
      const { error, value } = updateAnomalySchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const anomaly = await analyticsService.updateAnomaly(req.params.id, value, userId);
      return ApiResponse.success(res, anomaly, 'Anomaly updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Forecast enrollment
   * POST /api/v1/analytics/forecasts/enrollment
   */
  async forecastEnrollment(req, res, next) {
    try {
      const { error, value } = forecastEnrollmentSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const forecast = await analyticsService.forecastEnrollment(value);
      return ApiResponse.success(res, forecast, 'Enrollment forecast generated successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get forecasts
   * GET /api/v1/analytics/forecasts
   */
  async getForecasts(req, res, next) {
    try {
      const { school_id, academic_year, class_level } = req.query;

      const result = await analyticsService.getForecasts({
        school_id,
        academic_year,
        class_level
      });

      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate recommendations
   * POST /api/v1/analytics/recommendations/generate
   */
  async generateRecommendations(req, res, next) {
    try {
      const { error, value } = generateRecommendationsSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const recommendations = await analyticsService.generateRecommendations(value);
      return ApiResponse.success(res, recommendations, 'Recommendations generated successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recommendations
   * GET /api/v1/analytics/recommendations
   */
  async getRecommendations(req, res, next) {
    try {
      const { error, value } = listRecommendationsQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await analyticsService.getRecommendations(value);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recommendation by ID
   * GET /api/v1/analytics/recommendations/:id
   */
  async getRecommendation(req, res, next) {
    try {
      const recommendation = await analyticsService.getRecommendation(req.params.id);
      return ApiResponse.success(res, recommendation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update recommendation
   * PUT /api/v1/analytics/recommendations/:id
   */
  async updateRecommendation(req, res, next) {
    try {
      const { error, value } = updateRecommendationSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const recommendation = await analyticsService.updateRecommendation(req.params.id, value);
      return ApiResponse.success(res, recommendation, 'Recommendation updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student risk level
   * GET /api/v1/analytics/students/:studentId/risk-level
   */
  async getStudentRiskLevel(req, res, next) {
    try {
      const { studentId } = req.params;
      const riskLevel = await analyticsService.getStudentRiskLevel(studentId);
      return ApiResponse.success(res, { student_id: studentId, risk_level: riskLevel });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get analytics summary
   * GET /api/v1/analytics/summary
   */
  async getAnalyticsSummary(req, res, next) {
    try {
      const { school_id, academic_year } = req.query;

      if (!school_id || !academic_year) {
        return ApiResponse.error(res, 'school_id and academic_year are required', 400);
      }

      const summary = await analyticsService.getAnalyticsSummary(school_id, academic_year);
      return ApiResponse.success(res, summary);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
