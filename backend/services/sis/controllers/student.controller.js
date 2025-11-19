const studentService = require('../services/student.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  studentSchema,
  studentUpdateSchema,
  guardianSchema,
  medicalRecordSchema,
  listStudentsSchema,
} = require('../validators/student.validator');

class StudentController {
  /**
   * Create new student
   */
  async createStudent(req, res, next) {
    try {
      // Validate request body
      const { error, value } = studentSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      // TODO: Get user ID from authentication middleware
      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';

      const student = await studentService.createStudent(value, userId);

      return ApiResponse.created(res, student, 'Student created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student by ID
   */
  async getStudent(req, res, next) {
    try {
      const { id } = req.params;
      const includeParam = req.query.include || '';
      const include = includeParam.split(',').filter(Boolean);

      const student = await studentService.getStudentById(id, include);

      return ApiResponse.success(res, student);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List students with filtering and pagination
   */
  async listStudents(req, res, next) {
    try {
      // Validate query parameters
      const { error, value } = listStudentsSchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const result = await studentService.listStudents(value);

      return ApiResponse.paginated(
        res,
        result.students,
        result.pagination,
        'Students retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update student
   */
  async updateStudent(req, res, next) {
    try {
      const { id } = req.params;

      // Validate request body
      const { error, value } = studentUpdateSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      // TODO: Get user ID from authentication middleware
      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';

      const student = await studentService.updateStudent(id, value, userId);

      return ApiResponse.success(res, student, 'Student updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete student (soft delete)
   */
  async deleteStudent(req, res, next) {
    try {
      const { id } = req.params;

      // TODO: Get user ID from authentication middleware
      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';

      await studentService.deleteStudent(id, userId);

      return ApiResponse.noContent(res, 'Student deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add guardian to student
   */
  async addGuardian(req, res, next) {
    try {
      const { id } = req.params;

      // Add student_id from route params
      const guardianData = {
        ...req.body,
        student_id: id,
      };

      // Validate request body
      const { error, value } = guardianSchema.validate(guardianData);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      // TODO: Get user ID from authentication middleware
      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';

      const guardian = await studentService.addGuardian(value, userId);

      return ApiResponse.created(res, guardian, 'Guardian added successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update medical record
   */
  async updateMedicalRecord(req, res, next) {
    try {
      const { id } = req.params;

      // Add student_id from route params
      const medicalData = {
        ...req.body,
        student_id: id,
      };

      // Validate request body
      const { error, value } = medicalRecordSchema.validate(medicalData);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      // TODO: Get user ID from authentication middleware
      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';

      const medical = await studentService.updateMedicalRecord(value, userId);

      return ApiResponse.success(res, medical, 'Medical record updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student statistics
   */
  async getStatistics(req, res, next) {
    try {
      const { school_id } = req.query;

      if (!school_id) {
        return ApiResponse.validationError(res, ['school_id is required']);
      }

      // TODO: Implement statistics logic
      const stats = {
        total_students: 0,
        active_students: 0,
        inactive_students: 0,
        graduated_students: 0,
        by_class: {},
        by_curriculum: {},
      };

      return ApiResponse.success(res, stats, 'Statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StudentController();
