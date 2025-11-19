/**
 * Unit tests for Student Service
 */

const studentService = require('../services/student.service.improved');
const { query } = require('../../../shared/config/database');

// Mock the database module
jest.mock('../../../shared/config/database');
jest.mock('../../../shared/utils/cache', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  invalidateResource: jest.fn()
}));

describe('StudentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createStudent', () => {
    it('should create a student successfully', async () => {
      const mockStudent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        studentNumber: 'STU001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        dateOfBirth: '2010-01-01',
        classId: '123e4567-e89b-12d3-a456-426614174001',
        academicYear: '2024-2025',
        admissionDate: '2024-01-01'
      };

      query.mockResolvedValue({
        rows: [mockStudent]
      });

      const result = await studentService.createStudent({
        studentNumber: 'STU001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        dateOfBirth: '2010-01-01',
        classId: '123e4567-e89b-12d3-a456-426614174001',
        academicYear: '2024-2025',
        admissionDate: '2024-01-01'
      });

      expect(result).toEqual(mockStudent);
      expect(query).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      query.mockRejectedValue(new Error('Database error'));

      await expect(
        studentService.createStudent({
          studentNumber: 'STU001',
          firstName: 'John',
          lastName: 'Doe'
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('getStudentById', () => {
    it('should return student when found', async () => {
      const mockStudent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      query.mockResolvedValue({
        rows: [mockStudent]
      });

      const result = await studentService.getStudentById('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual(mockStudent);
    });

    it('should return null when student not found', async () => {
      query.mockResolvedValue({
        rows: []
      });

      const result = await studentService.getStudentById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getAllStudents', () => {
    it('should return paginated students', async () => {
      const mockStudents = [
        { id: '1', firstName: 'John', lastName: 'Doe' },
        { id: '2', firstName: 'Jane', lastName: 'Smith' }
      ];

      // Mock count query
      query.mockResolvedValueOnce({
        rows: [{ count: '10' }]
      });

      // Mock data query
      query.mockResolvedValueOnce({
        rows: mockStudents
      });

      const result = await studentService.getAllStudents({}, 1, 50);

      expect(result.students).toEqual(mockStudents);
      expect(result.total).toBe(10);
      expect(query).toHaveBeenCalledTimes(2);
    });

    it('should apply filters correctly', async () => {
      query.mockResolvedValueOnce({
        rows: [{ count: '5' }]
      });

      query.mockResolvedValueOnce({
        rows: []
      });

      await studentService.getAllStudents({
        status: 'active',
        classId: '123e4567-e89b-12d3-a456-426614174001'
      }, 1, 50);

      // Verify the query was called with status and classId filters
      const sqlCall = query.mock.calls[0][0];
      expect(sqlCall).toContain('status = $1');
      expect(sqlCall).toContain('class_id = $2');
    });
  });

  describe('updateStudent', () => {
    it('should update student successfully', async () => {
      const mockUpdatedStudent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        firstName: 'Updated',
        lastName: 'Name'
      };

      query.mockResolvedValue({
        rows: [mockUpdatedStudent]
      });

      const result = await studentService.updateStudent(
        '123e4567-e89b-12d3-a456-426614174000',
        { firstName: 'Updated', lastName: 'Name' }
      );

      expect(result).toEqual(mockUpdatedStudent);
    });

    it('should throw error when student not found', async () => {
      query.mockResolvedValue({
        rows: []
      });

      await expect(
        studentService.updateStudent('non-existent-id', { firstName: 'Test' })
      ).rejects.toThrow('Student not found');
    });

    it('should throw error when no valid fields provided', async () => {
      await expect(
        studentService.updateStudent('123e4567-e89b-12d3-a456-426614174000', {})
      ).rejects.toThrow('No valid fields to update');
    });
  });

  describe('deleteStudent', () => {
    it('should soft delete student successfully', async () => {
      query.mockResolvedValue({
        rows: [{ id: '123e4567-e89b-12d3-a456-426614174000' }]
      });

      const result = await studentService.deleteStudent('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toBe(true);
      expect(query).toHaveBeenCalled();
    });

    it('should throw error when student not found', async () => {
      query.mockResolvedValue({
        rows: []
      });

      await expect(
        studentService.deleteStudent('non-existent-id')
      ).rejects.toThrow('Student not found');
    });
  });

  describe('getStudentStatistics', () => {
    it('should return correct statistics', async () => {
      const mockStats = {
        total: '100',
        active: '80',
        inactive: '10',
        graduated: '5',
        withdrawn: '5',
        male: '60',
        female: '40',
        other: '0'
      };

      query.mockResolvedValue({
        rows: [mockStats]
      });

      const result = await studentService.getStudentStatistics();

      expect(result).toEqual(mockStats);
    });
  });
});
