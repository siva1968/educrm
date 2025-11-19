const assignmentService = require('../services/assignment.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  createAssignmentSchema,
  updateAssignmentSchema,
  listAssignmentsQuerySchema,
  submitAssignmentSchema,
  updateSubmissionSchema,
  gradeSubmissionSchema,
  getMyAssignmentsQuerySchema,
  getSubmissionsQuerySchema,
  assignmentAnalyticsQuerySchema
} = require('../validators/assignment.validator');

/**
 * Assignment Management Controller
 * Handles HTTP requests for assignments and submissions
 */

class AssignmentController {
  /**
   * Create assignment
   * POST /api/v1/assignments
   */
  async createAssignment(req, res, next) {
    try {
      const { error, value } = createAssignmentSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const assignment = await assignmentService.createAssignment(value, userId);

      return ApiResponse.success(
        res,
        assignment,
        'Assignment created successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get assignment by ID
   * GET /api/v1/assignments/:id
   */
  async getAssignment(req, res, next) {
    try {
      const includeSubmissions = req.query.include_submissions === 'true';
      const assignment = await assignmentService.getAssignmentById(
        req.params.id,
        includeSubmissions
      );

      return ApiResponse.success(res, assignment);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List assignments
   * GET /api/v1/assignments
   */
  async listAssignments(req, res, next) {
    try {
      const { error, value } = listAssignmentsQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await assignmentService.listAssignments(value);

      return ApiResponse.paginated(
        res,
        result.assignments,
        result.pagination,
        'Assignments retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update assignment
   * PUT /api/v1/assignments/:id
   */
  async updateAssignment(req, res, next) {
    try {
      const { error, value } = updateAssignmentSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const assignment = await assignmentService.updateAssignment(
        req.params.id,
        value,
        userId
      );

      return ApiResponse.success(res, assignment, 'Assignment updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete assignment
   * DELETE /api/v1/assignments/:id
   */
  async deleteAssignment(req, res, next) {
    try {
      const userId = req.user.userId;
      const result = await assignmentService.deleteAssignment(req.params.id, userId);

      return ApiResponse.success(res, result, 'Assignment deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit assignment
   * POST /api/v1/assignments/:id/submit
   */
  async submitAssignment(req, res, next) {
    try {
      const submissionData = {
        ...req.body,
        assignment_id: req.params.id
      };

      const { error, value } = submitAssignmentSchema.validate(submissionData);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const submission = await assignmentService.submitAssignment(value, userId);

      return ApiResponse.success(
        res,
        submission,
        'Assignment submitted successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get assignment submissions
   * GET /api/v1/assignments/:id/submissions
   */
  async getSubmissions(req, res, next) {
    try {
      const filters = {
        assignment_id: req.params.id,
        status: req.query.status,
        student_id: req.query.student_id
      };

      const { error, value } = getSubmissionsQuerySchema.validate(filters);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const submissions = await assignmentService.getSubmissions(value);

      return ApiResponse.success(
        res,
        submissions,
        'Submissions retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get submission by ID
   * GET /api/v1/assignments/submissions/:submissionId
   */
  async getSubmission(req, res, next) {
    try {
      const submission = await assignmentService.getSubmissionById(req.params.submissionId);

      return ApiResponse.success(res, submission, 'Submission retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Grade submission
   * PUT /api/v1/assignments/submissions/:submissionId/grade
   */
  async gradeSubmission(req, res, next) {
    try {
      const { error, value } = gradeSubmissionSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const userId = req.user.userId;
      const submission = await assignmentService.gradeSubmission(
        req.params.submissionId,
        value,
        userId
      );

      return ApiResponse.success(res, submission, 'Submission graded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my assignments (student view)
   * GET /api/v1/assignments/my-assignments
   */
  async getMyAssignments(req, res, next) {
    try {
      const filters = {
        student_id: req.query.student_id,
        subject_id: req.query.subject_id,
        status: req.query.status,
        from_date: req.query.from_date,
        to_date: req.query.to_date,
        page: req.query.page,
        limit: req.query.limit
      };

      const { error, value } = getMyAssignmentsQuerySchema.validate(filters);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await assignmentService.getMyAssignments(value);

      return ApiResponse.paginated(
        res,
        result.assignments,
        result.pagination,
        'My assignments retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my submissions (student view)
   * GET /api/v1/assignments/my-submissions
   */
  async getMySubmissions(req, res, next) {
    try {
      if (!req.query.student_id) {
        return ApiResponse.validationError(res, [
          { message: 'student_id query parameter is required' }
        ]);
      }

      // Get all submissions for this student across all assignments
      const query = `
        SELECT sub.*, a.assignment_title, a.max_marks, a.due_date,
               s.subject_name, s.subject_code
        FROM academic.assignment_submissions sub
        JOIN academic.assignments a ON sub.assignment_id = a.assignment_id
        JOIN academic.subjects s ON a.subject_id = s.subject_id
        WHERE sub.student_id = $1 AND sub.is_deleted = false
        ORDER BY sub.submission_date DESC
      `;

      const db = require('../../../shared/config/database');
      const result = await db.query(query, [req.query.student_id]);

      return ApiResponse.success(
        res,
        result.rows,
        'My submissions retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get assignment analytics
   * GET /api/v1/assignments/:id/analytics
   */
  async getAssignmentAnalytics(req, res, next) {
    try {
      const { error, value } = assignmentAnalyticsQuerySchema.validate({
        assignment_id: req.params.id
      });
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const analytics = await assignmentService.getAssignmentAnalytics(value.assignment_id);

      return ApiResponse.success(
        res,
        analytics,
        'Assignment analytics retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AssignmentController();
