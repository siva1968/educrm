const predictionService = require('../services/prediction.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  predictPerformanceSchema,
  predictDropoutRiskSchema,
  recommendCareerPathsSchema,
  recommendCoursesSchema,
  predictGradeSchema
} = require('../validators/prediction.validator');

/**
 * Prediction Engine Controller
 * Handles HTTP requests for prediction operations
 */
class PredictionController {
  /**
   * Predict student performance
   * POST /api/v1/predictions/performance
   */
  async predictPerformance(req, res, next) {
    try {
      const { error, value } = predictPerformanceSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await predictionService.predictPerformance(value);

      return ApiResponse.success(res, result, 'Performance prediction completed', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Predict dropout risk
   * POST /api/v1/predictions/dropout-risk
   */
  async predictDropoutRisk(req, res, next) {
    try {
      const { error, value } = predictDropoutRiskSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await predictionService.predictDropoutRisk(value);

      return ApiResponse.success(res, result, 'Dropout risk prediction completed', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Recommend career paths
   * POST /api/v1/predictions/career-paths
   */
  async recommendCareerPaths(req, res, next) {
    try {
      const { error, value } = recommendCareerPathsSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await predictionService.recommendCareerPaths(value);

      return ApiResponse.success(res, result, 'Career paths recommended successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Recommend courses
   * POST /api/v1/predictions/courses
   */
  async recommendCourses(req, res, next) {
    try {
      const { error, value } = recommendCoursesSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await predictionService.recommendCourses(value);

      return ApiResponse.success(res, result, 'Courses recommended successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Predict final grade
   * POST /api/v1/predictions/grade
   */
  async predictGrade(req, res, next) {
    try {
      const { error, value } = predictGradeSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      // Calculate grade prediction
      const prediction = this.calculateGradePrediction(value);

      return ApiResponse.success(res, prediction, 'Grade prediction completed', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate grade prediction based on current performance and remaining work
   */
  calculateGradePrediction(data) {
    const {
      currentGrade,
      assignmentsRemaining,
      testsRemaining,
      weightings,
      historicalPerformance
    } = data;

    // Calculate completed work percentage
    const totalWeight = weightings.assignments + weightings.tests + weightings.final;
    const completedWeight = totalWeight - (weightings.final || 0.2);

    // Current grade represents completed work
    const completedScore = currentGrade;

    // Predict remaining work based on historical performance
    const predictedAssignmentScore = historicalPerformance.assignmentAverage;
    const predictedTestScore = historicalPerformance.testAverage;

    // Calculate best, worst, and expected case scenarios
    const bestCase = (completedScore * completedWeight) + (100 * (weightings.final || 0.2));
    const worstCase = (completedScore * completedWeight) + (0 * (weightings.final || 0.2));
    const expectedCase = (completedScore * completedWeight) +
      ((predictedAssignmentScore + predictedTestScore) / 2 * (weightings.final || 0.2));

    return {
      currentGrade: Math.round(currentGrade * 10) / 10,
      predictedFinalGrade: Math.round(expectedCase * 10) / 10,
      bestPossibleGrade: Math.round(bestCase * 10) / 10,
      worstPossibleGrade: Math.round(worstCase * 10) / 10,
      gradeRange: {
        min: Math.round(worstCase * 10) / 10,
        max: Math.round(bestCase * 10) / 10
      },
      scenarios: {
        bestCase: {
          grade: Math.round(bestCase * 10) / 10,
          letterGrade: this.getLetterGrade(bestCase),
          description: 'Perfect performance on all remaining work'
        },
        expectedCase: {
          grade: Math.round(expectedCase * 10) / 10,
          letterGrade: this.getLetterGrade(expectedCase),
          description: 'Based on historical performance average'
        },
        worstCase: {
          grade: Math.round(worstCase * 10) / 10,
          letterGrade: this.getLetterGrade(worstCase),
          description: 'No credit on remaining work'
        }
      },
      recommendations: this.generateGradeRecommendations(currentGrade, expectedCase, assignmentsRemaining, testsRemaining)
    };
  }

  /**
   * Get letter grade from numerical grade
   */
  getLetterGrade(grade) {
    if (grade >= 93) return 'A';
    if (grade >= 90) return 'A-';
    if (grade >= 87) return 'B+';
    if (grade >= 83) return 'B';
    if (grade >= 80) return 'B-';
    if (grade >= 77) return 'C+';
    if (grade >= 73) return 'C';
    if (grade >= 70) return 'C-';
    if (grade >= 67) return 'D+';
    if (grade >= 63) return 'D';
    if (grade >= 60) return 'D-';
    return 'F';
  }

  /**
   * Generate grade improvement recommendations
   */
  generateGradeRecommendations(currentGrade, expectedGrade, assignmentsRemaining, testsRemaining) {
    const recommendations = [];

    if (expectedGrade < 70) {
      recommendations.push({
        priority: 'high',
        action: 'Seek immediate tutoring or extra help',
        reason: 'Predicted final grade is below passing'
      });
    }

    if (currentGrade < 80 && assignmentsRemaining > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Focus on completing all remaining assignments with high quality',
        reason: 'Assignments can significantly improve your grade'
      });
    }

    if (testsRemaining > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Dedicate extra study time for remaining tests',
        reason: 'Tests have significant weight in final grade'
      });
    }

    if (currentGrade >= 85 && expectedGrade >= 90) {
      recommendations.push({
        priority: 'medium',
        action: 'Maintain consistent effort',
        reason: 'On track for excellent final grade'
      });
    }

    return recommendations;
  }

  /**
   * Get prediction capabilities
   * GET /api/v1/predictions/capabilities
   */
  async getCapabilities(req, res) {
    const capabilities = {
      performancePrediction: {
        available: true,
        features: [
          'Next term grade prediction',
          'Final grade prediction',
          'Performance trend analysis',
          'Risk assessment',
          'Personalized recommendations'
        ],
        algorithms: ['Multi-linear regression', 'Trend analysis', 'Statistical modeling'],
        accuracy: '80-85%'
      },
      dropoutRisk: {
        available: true,
        features: [
          'Risk level classification',
          'Risk factor identification',
          'Intervention recommendations',
          'Timeline estimation'
        ],
        algorithms: ['Neural networks', 'Risk scoring', 'Pattern recognition'],
        accuracy: '75-80%'
      },
      careerRecommendations: {
        available: true,
        features: [
          'Career path matching',
          'Educational pathway planning',
          'Skill gap analysis',
          'Career fit scoring'
        ],
        algorithms: ['Profile matching', 'Collaborative filtering', 'Interest analysis']
      },
      courseRecommendations: {
        available: true,
        features: [
          'Prerequisite checking',
          'Career-aligned course selection',
          'Course timeline planning',
          'Academic pathway optimization'
        ],
        algorithms: ['Rule-based recommendation', 'Goal alignment']
      },
      gradePrediction: {
        available: true,
        features: [
          'Final grade prediction',
          'Multiple scenario analysis',
          'Grade range estimation',
          'Improvement recommendations'
        ],
        algorithms: ['Weighted average calculation', 'Scenario modeling']
      }
    };

    return ApiResponse.success(res, capabilities);
  }

  /**
   * Get prediction statistics
   * GET /api/v1/predictions/statistics
   */
  async getStatistics(req, res) {
    // TODO: Implement actual statistics from database
    const statistics = {
      totalPredictions: 0,
      predictionsByType: {
        performance: 0,
        dropout: 0,
        career: 0,
        courses: 0,
        grades: 0
      },
      averageAccuracy: {
        performance: 0.82,
        dropout: 0.78,
        grades: 0.85
      },
      modelVersions: {
        performance: '1.0.0',
        dropout: '1.0.0'
      },
      lastUpdated: new Date().toISOString()
    };

    return ApiResponse.success(res, statistics);
  }
}

module.exports = new PredictionController();
