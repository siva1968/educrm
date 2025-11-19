const timetableService = require('../services/timetable.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  createConfigSchema,
  updateConfigSchema,
  createTimetableEntrySchema,
  updateTimetableEntrySchema,
  getClassTimetableQuerySchema,
  getTeacherTimetableQuerySchema,
  batchCreateTimetableSchema,
  getTeacherWorkloadQuerySchema
} = require('../validators/timetable.validator');

/**
 * Timetable Management Controller
 * Handles HTTP requests for timetable configuration and scheduling
 */

class TimetableController {
  /**
   * Create timetable configuration
   * POST /api/v1/timetable/config
   */
  async createConfig(req, res, next) {
    try {
      const { error, value } = createConfigSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user?.userId || 'system';
      const config = await timetableService.createConfig(value, userId);

      return ApiResponse.success(res, config, 'Configuration created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get timetable configuration
   * GET /api/v1/timetable/config
   */
  async getConfig(req, res, next) {
    try {
      const { school_id, academic_year } = req.query;

      if (!school_id) {
        return ApiResponse.validationError(res, [
          { message: 'school_id query parameter is required' }
        ]);
      }

      const config = await timetableService.getActiveConfig(school_id, academic_year);

      return ApiResponse.success(res, config);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update timetable configuration
   * PUT /api/v1/timetable/config/:id
   */
  async updateConfig(req, res, next) {
    try {
      const { error, value } = updateConfigSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user?.userId || 'system';
      const config = await timetableService.updateConfig(req.params.id, value, userId);

      return ApiResponse.success(res, config, 'Configuration updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create timetable entry
   * POST /api/v1/timetable
   */
  async createTimetableEntry(req, res, next) {
    try {
      const { error, value } = createTimetableEntrySchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user?.userId || 'system';
      const entry = await timetableService.createTimetableEntry(value, userId);

      return ApiResponse.success(res, entry, 'Timetable entry created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch create/update timetable
   * POST /api/v1/timetable/batch
   */
  async batchCreateTimetable(req, res, next) {
    try {
      const { error, value } = batchCreateTimetableSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user?.userId || 'system';
      const result = await timetableService.batchCreateTimetable(value, userId);

      return ApiResponse.success(res, result, 'Timetable created/updated successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get class timetable
   * GET /api/v1/timetable/class/:class
   */
  async getClassTimetable(req, res, next) {
    try {
      const filters = {
        school_id: req.query.school_id,
        class: req.params.class,
        section: req.query.section,
        day_of_week: req.query.day_of_week
      };

      const { error, value } = getClassTimetableQuerySchema.validate(filters);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const timetable = await timetableService.getClassTimetable(value);

      return ApiResponse.success(res, timetable, 'Class timetable retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get teacher timetable
   * GET /api/v1/timetable/teacher/:teacherId
   */
  async getTeacherTimetable(req, res, next) {
    try {
      const filters = {
        teacher_id: req.params.teacherId,
        day_of_week: req.query.day_of_week
      };

      const { error, value } = getTeacherTimetableQuerySchema.validate(filters);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const timetable = await timetableService.getTeacherTimetable(value);

      return ApiResponse.success(
        res,
        timetable,
        'Teacher timetable retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update timetable entry
   * PUT /api/v1/timetable/:id
   */
  async updateTimetableEntry(req, res, next) {
    try {
      const { error, value } = updateTimetableEntrySchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user?.userId || 'system';
      const entry = await timetableService.updateTimetableEntry(
        req.params.id,
        value,
        userId
      );

      return ApiResponse.success(res, entry, 'Timetable entry updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get teacher workload
   * GET /api/v1/timetable/workload/teacher/:teacherId
   */
  async getTeacherWorkload(req, res, next) {
    try {
      const filters = {
        school_id: req.query.school_id,
        teacher_id: req.params.teacherId
      };

      const workload = await timetableService.getTeacherWorkload(filters);

      return ApiResponse.success(res, workload, 'Teacher workload retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get workload summary
   * GET /api/v1/timetable/workload/summary
   */
  async getWorkloadSummary(req, res, next) {
    try {
      const { school_id } = req.query;

      if (!school_id) {
        return ApiResponse.validationError(res, [
          { message: 'school_id query parameter is required' }
        ]);
      }

      const filters = { school_id };
      const { error, value } = getTeacherWorkloadQuerySchema.validate(filters);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const summary = await timetableService.getTeacherWorkload(value);

      return ApiResponse.success(res, summary, 'Workload summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TimetableController();
