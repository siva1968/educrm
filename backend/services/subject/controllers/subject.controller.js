const subjectService = require('../services/subject.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  createSubjectSchema,
  updateSubjectSchema,
  addSyllabusSchema,
  updateSyllabusSchema,
  listSubjectsQuerySchema,
  getSubjectSchema,
  deleteSubjectSchema,
  getSyllabusQuerySchema
} = require('../validators/subject.validator');

/**
 * Subject Management Controller
 * Handles HTTP requests for subject and syllabus management
 */

class SubjectController {
  /**
   * Create a new subject
   * POST /api/v1/subjects
   */
  async createSubject(req, res, next) {
    try {
      // Validate request body
      const { error, value } = createSubjectSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      // TODO: Get user ID from auth middleware
      const userId = req.user?.userId || 'system';

      const subject = await subjectService.createSubject(value, userId);

      return ApiResponse.success(
        res,
        subject,
        'Subject created successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get subject by ID
   * GET /api/v1/subjects/:id
   */
  async getSubject(req, res, next) {
    try {
      const { error, value } = getSubjectSchema.validate({ subject_id: req.params.id });
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const includeSyllabus = req.query.include_syllabus === 'true';
      const subject = await subjectService.getSubjectById(value.subject_id, includeSyllabus);

      return ApiResponse.success(res, subject);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List subjects with filters
   * GET /api/v1/subjects
   */
  async listSubjects(req, res, next) {
    try {
      const { error, value } = listSubjectsQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await subjectService.listSubjects(value);

      return ApiResponse.paginated(
        res,
        result.subjects,
        result.pagination,
        'Subjects retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update subject
   * PUT /api/v1/subjects/:id
   */
  async updateSubject(req, res, next) {
    try {
      const { error: idError } = getSubjectSchema.validate({ subject_id: req.params.id });
      if (idError) {
        return ApiResponse.validationError(res, idError.details);
      }

      const { error, value } = updateSubjectSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user?.userId || 'system';

      const subject = await subjectService.updateSubject(req.params.id, value, userId);

      return ApiResponse.success(res, subject, 'Subject updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete subject
   * DELETE /api/v1/subjects/:id
   */
  async deleteSubject(req, res, next) {
    try {
      const { error, value } = deleteSubjectSchema.validate({ subject_id: req.params.id });
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user?.userId || 'system';

      const result = await subjectService.deleteSubject(value.subject_id, userId);

      return ApiResponse.success(res, result, 'Subject deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add syllabus to subject
   * POST /api/v1/subjects/:id/syllabus
   */
  async addSyllabus(req, res, next) {
    try {
      // Add subject_id from params to body for validation
      const syllabusData = {
        ...req.body,
        subject_id: req.params.id
      };

      const { error, value } = addSyllabusSchema.validate(syllabusData);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user?.userId || 'system';

      const syllabus = await subjectService.addSyllabus(value, userId);

      return ApiResponse.success(
        res,
        syllabus,
        'Syllabus added successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get syllabus for a subject
   * GET /api/v1/subjects/:id/syllabus
   */
  async getSyllabus(req, res, next) {
    try {
      const filters = {
        subject_id: req.params.id,
        class_level: req.query.class_level,
        academic_year: req.query.academic_year,
        status: req.query.status
      };

      const { error, value } = getSyllabusQuerySchema.validate(filters);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const syllabus = await subjectService.getSyllabus(value);

      return ApiResponse.success(res, syllabus, 'Syllabus retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update syllabus
   * PUT /api/v1/subjects/syllabus/:syllabusId
   */
  async updateSyllabus(req, res, next) {
    try {
      const { error, value } = updateSyllabusSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user?.userId || 'system';

      const syllabus = await subjectService.updateSyllabus(
        req.params.syllabusId,
        value,
        userId
      );

      return ApiResponse.success(res, syllabus, 'Syllabus updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get subjects by class level
   * GET /api/v1/subjects/by-class/:classLevel
   */
  async getSubjectsByClass(req, res, next) {
    try {
      const { school_id } = req.query;
      const { classLevel } = req.params;

      if (!school_id) {
        return ApiResponse.validationError(res, [
          { message: 'school_id query parameter is required' }
        ]);
      }

      const subjects = await subjectService.getSubjectsByClass(school_id, classLevel);

      return ApiResponse.success(
        res,
        subjects,
        `Subjects for class ${classLevel} retrieved successfully`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get subjects by curriculum
   * GET /api/v1/subjects/by-curriculum/:curriculum
   */
  async getSubjectsByCurriculum(req, res, next) {
    try {
      const { school_id } = req.query;
      const { curriculum } = req.params;

      if (!school_id) {
        return ApiResponse.validationError(res, [
          { message: 'school_id query parameter is required' }
        ]);
      }

      const subjects = await subjectService.getSubjectsByCurriculum(school_id, curriculum);

      return ApiResponse.success(
        res,
        subjects,
        `Subjects for ${curriculum} curriculum retrieved successfully`
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SubjectController();
