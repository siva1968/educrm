const examinationService = require('../services/examination.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  createExaminationSchema,
  updateExaminationSchema,
  listExaminationsQuerySchema,
  addExamScheduleSchema,
  updateExamScheduleSchema,
  recordExamResultSchema,
  batchRecordResultsSchema,
  updateExamResultSchema,
  getStudentResultsQuerySchema,
  examAnalyticsQuerySchema,
  toppersQuerySchema
} = require('../validators/examination.validator');

/**
 * Examination Management Controller
 * Handles HTTP requests for examinations, scheduling, and results
 */

class ExaminationController {
  /**
   * Create examination
   * POST /api/v1/examinations
   */
  async createExamination(req, res, next) {
    try {
      const { error, value } = createExaminationSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const examination = await examinationService.createExamination(value, userId);

      return ApiResponse.success(
        res,
        examination,
        'Examination created successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get examination by ID
   * GET /api/v1/examinations/:id
   */
  async getExamination(req, res, next) {
    try {
      const includeSchedule = req.query.include_schedule === 'true';
      const examination = await examinationService.getExaminationById(
        req.params.id,
        includeSchedule
      );

      return ApiResponse.success(res, examination);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List examinations
   * GET /api/v1/examinations
   */
  async listExaminations(req, res, next) {
    try {
      const { error, value } = listExaminationsQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await examinationService.listExaminations(value);

      return ApiResponse.paginated(
        res,
        result.examinations,
        result.pagination,
        'Examinations retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update examination
   * PUT /api/v1/examinations/:id
   */
  async updateExamination(req, res, next) {
    try {
      const { error, value } = updateExaminationSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const examination = await examinationService.updateExamination(
        req.params.id,
        value,
        userId
      );

      return ApiResponse.success(res, examination, 'Examination updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add exam schedule (subject-wise timetable)
   * POST /api/v1/examinations/:id/schedule
   */
  async addExamSchedule(req, res, next) {
    try {
      const scheduleData = {
        ...req.body,
        examination_id: req.params.id
      };

      const { error, value } = addExamScheduleSchema.validate(scheduleData);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const schedule = await examinationService.addExamSchedule(value, userId);

      return ApiResponse.success(
        res,
        schedule,
        'Exam schedule added successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get exam schedule (timetable)
   * GET /api/v1/examinations/:id/schedule
   */
  async getExamSchedule(req, res, next) {
    try {
      const schedule = await examinationService.getExamSchedule(req.params.id);

      return ApiResponse.success(
        res,
        schedule,
        'Exam schedule retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update exam schedule
   * PUT /api/v1/examinations/schedule/:scheduleId
   */
  async updateExamSchedule(req, res, next) {
    try {
      const { error, value } = updateExamScheduleSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const schedule = await examinationService.updateExamSchedule(
        req.params.scheduleId,
        value,
        userId
      );

      return ApiResponse.success(res, schedule, 'Exam schedule updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record exam result
   * POST /api/v1/examinations/results
   */
  async recordResult(req, res, next) {
    try {
      const { error, value } = recordExamResultSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const result = await examinationService.recordResult(value, userId);

      return ApiResponse.success(res, result, 'Exam result recorded successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record results in batch
   * POST /api/v1/examinations/results/batch
   */
  async recordBatchResults(req, res, next) {
    try {
      const { error, value } = batchRecordResultsSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const result = await examinationService.recordBatchResults(value, userId);

      return ApiResponse.success(
        res,
        result,
        'Batch exam results recorded successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get exam results for a specific examination
   * GET /api/v1/examinations/:id/results
   */
  async getExaminationResults(req, res, next) {
    try {
      const results = await examinationService.getStudentResults({
        examination_id: req.params.id,
        student_id: req.query.student_id
      });

      return ApiResponse.success(res, results, 'Exam results retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student exam results
   * GET /api/v1/examinations/results/student/:studentId
   */
  async getStudentResults(req, res, next) {
    try {
      const filters = {
        student_id: req.params.studentId,
        examination_id: req.query.examination_id,
        academic_year: req.query.academic_year,
        exam_type: req.query.exam_type
      };

      const { error, value } = getStudentResultsQuerySchema.validate(filters);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const results = await examinationService.getStudentResults(value);

      return ApiResponse.success(
        res,
        results,
        'Student exam results retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get exam analytics
   * GET /api/v1/examinations/:id/analytics
   */
  async getExamAnalytics(req, res, next) {
    try {
      const filters = {
        examination_id: req.params.id,
        class: req.query.class,
        subject_id: req.query.subject_id
      };

      const { error, value } = examAnalyticsQuerySchema.validate(filters);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const analytics = await examinationService.getExamAnalytics(value);

      return ApiResponse.success(
        res,
        analytics,
        'Exam analytics retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top performers
   * GET /api/v1/examinations/:id/toppers
   */
  async getToppers(req, res, next) {
    try {
      const filters = {
        examination_id: req.params.id,
        class: req.query.class,
        limit: req.query.limit ? parseInt(req.query.limit) : 10
      };

      const { error, value } = toppersQuerySchema.validate(filters);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const toppers = await examinationService.getToppers(value);

      return ApiResponse.success(res, toppers, 'Top performers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ExaminationController();
