const gradebookService = require('../services/gradebook.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  createAssessmentSchema,
  updateAssessmentSchema,
  listAssessmentsQuerySchema,
  recordGradeSchema,
  batchRecordGradesSchema,
  updateGradeSchema,
  getStudentGradesQuerySchema,
  classPerformanceQuerySchema
} = require('../validators/gradebook.validator');

/**
 * Grade Book Controller
 * Handles HTTP requests for assessments, grades, and report cards
 */

class GradeBookController {
  /**
   * Create assessment
   * POST /api/v1/gradebook/assessments
   */
  async createAssessment(req, res, next) {
    try {
      const { error, value } = createAssessmentSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const assessment = await gradebookService.createAssessment(value, userId);

      return ApiResponse.success(
        res,
        assessment,
        'Assessment created successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get assessment by ID
   * GET /api/v1/gradebook/assessments/:id
   */
  async getAssessment(req, res, next) {
    try {
      const assessment = await gradebookService.getAssessmentById(req.params.id);
      return ApiResponse.success(res, assessment);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List assessments
   * GET /api/v1/gradebook/assessments
   */
  async listAssessments(req, res, next) {
    try {
      const { error, value } = listAssessmentsQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await gradebookService.listAssessments(value);

      return ApiResponse.paginated(
        res,
        result.assessments,
        result.pagination,
        'Assessments retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update assessment
   * PUT /api/v1/gradebook/assessments/:id
   */
  async updateAssessment(req, res, next) {
    try {
      const { error, value } = updateAssessmentSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const assessment = await gradebookService.updateAssessment(
        req.params.id,
        value,
        userId
      );

      return ApiResponse.success(res, assessment, 'Assessment updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record grade for a student
   * POST /api/v1/gradebook/grades
   */
  async recordGrade(req, res, next) {
    try {
      const { error, value } = recordGradeSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const grade = await gradebookService.recordGrade(value, userId);

      return ApiResponse.success(res, grade, 'Grade recorded successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record grades in batch
   * POST /api/v1/gradebook/grades/batch
   */
  async recordBatchGrades(req, res, next) {
    try {
      const { error, value } = batchRecordGradesSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const result = await gradebookService.recordBatchGrades(value, userId);

      return ApiResponse.success(res, result, 'Batch grades recorded successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student grades
   * GET /api/v1/gradebook/grades/student/:studentId
   */
  async getStudentGrades(req, res, next) {
    try {
      const filters = {
        student_id: req.params.studentId,
        subject_id: req.query.subject_id,
        assessment_type: req.query.assessment_type,
        from_date: req.query.from_date,
        to_date: req.query.to_date
      };

      const { error, value } = getStudentGradesQuerySchema.validate(filters);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const grades = await gradebookService.getStudentGrades(value);

      return ApiResponse.success(res, grades, 'Student grades retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update grade
   * PUT /api/v1/gradebook/grades/:gradeId
   */
  async updateGrade(req, res, next) {
    try {
      const { error, value } = updateGradeSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const grade = await gradebookService.updateGrade(req.params.gradeId, value, userId);

      return ApiResponse.success(res, grade, 'Grade updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get class performance analytics
   * GET /api/v1/gradebook/analytics/class
   */
  async getClassPerformance(req, res, next) {
    try {
      const { error, value } = classPerformanceQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const performance = await gradebookService.getClassPerformance(value);

      return ApiResponse.success(
        res,
        performance,
        'Class performance retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get assessment statistics
   * GET /api/v1/gradebook/assessments/:id/statistics
   */
  async getAssessmentStatistics(req, res, next) {
    try {
      const statistics = await gradebookService.getClassPerformance({
        assessment_id: req.params.id
      });

      return ApiResponse.success(
        res,
        statistics,
        'Assessment statistics retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GradeBookController();
