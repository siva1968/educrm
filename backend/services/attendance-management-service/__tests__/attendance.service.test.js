/**
 * Attendance Service Unit Tests
 * Example test file demonstrating test patterns
 */

const {
  mockSequelizeModel,
  mockRedisClient,
  testData,
} = require('../../../shared/test-utils');

// Mock dependencies
jest.mock('../../../shared/models', () => ({
  Attendance: mockSequelizeModel('Attendance'),
  Student: mockSequelizeModel('Student'),
  Class: mockSequelizeModel('Class'),
  School: mockSequelizeModel('School'),
}));

jest.mock('../../../shared/utils/cache-v4', () => {
  return jest.fn().mockImplementation(() => mockRedisClient());
});

const AttendanceService = require('../services/attendance.service');
const models = require('../../../shared/models');

describe('AttendanceService', () => {
  let attendanceService;
  let mockCache;

  beforeEach(() => {
    // Create fresh instances for each test
    mockCache = mockRedisClient();
    attendanceService = new AttendanceService();
    attendanceService.cache = mockCache;

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('markAttendance', () => {
    it('should mark attendance for a student successfully', async () => {
      // Arrange
      const attendanceData = testData.attendance({
        studentId: 'student-123',
        date: '2024-01-15',
        status: 'present',
      });

      models.Attendance.markAttendance = jest.fn().mockResolvedValue(attendanceData);

      // Act
      const result = await attendanceService.markAttendance(attendanceData);

      // Assert
      expect(result).toEqual(attendanceData);
      expect(models.Attendance.markAttendance).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'student-123',
          status: 'present',
        })
      );
    });

    it('should throw error when studentId is missing', async () => {
      // Arrange
      const invalidData = {
        date: '2024-01-15',
        status: 'present',
      };

      // Act & Assert
      await expect(attendanceService.markAttendance(invalidData))
        .rejects.toThrow('studentId is required');
    });

    it('should invalidate cache after marking attendance', async () => {
      // Arrange
      const attendanceData = testData.attendance();
      models.Attendance.markAttendance = jest.fn().mockResolvedValue(attendanceData);

      // Act
      await attendanceService.markAttendance(attendanceData);

      // Assert
      expect(mockCache.del).toHaveBeenCalled();
    });
  });

  describe('getStudentAttendance', () => {
    it('should return cached attendance if available', async () => {
      // Arrange
      const cachedData = [testData.attendance()];
      mockCache.get.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await attendanceService.getStudentAttendance(
        'student-123',
        '2024-01-01',
        '2024-01-31'
      );

      // Assert
      expect(result).toEqual(cachedData);
      expect(mockCache.get).toHaveBeenCalled();
      expect(models.Attendance.findAll).not.toHaveBeenCalled();
    });

    it('should fetch from database when cache is empty', async () => {
      // Arrange
      const attendanceData = [testData.attendance()];
      mockCache.get.mockResolvedValue(null);
      models.Attendance.findAll = jest.fn().mockResolvedValue(attendanceData);

      // Act
      const result = await attendanceService.getStudentAttendance(
        'student-123',
        '2024-01-01',
        '2024-01-31'
      );

      // Assert
      expect(result).toEqual(attendanceData);
      expect(models.Attendance.findAll).toHaveBeenCalled();
      expect(mockCache.setEx).toHaveBeenCalled();
    });
  });

  describe('getStudentsWithLowAttendance', () => {
    it('should return students below threshold', async () => {
      // Arrange
      const lowAttendanceStudents = [
        {
          studentId: 'student-1',
          totalDays: 100,
          presentDays: 65,
          percentage: 65.0,
        },
      ];

      const mockQuery = jest.fn().mockResolvedValue(lowAttendanceStudents);
      models.Attendance.sequelize = {
        query: mockQuery,
      };

      // Act
      const result = await attendanceService.getStudentsWithLowAttendance(
        'school-123',
        '2024-01-01',
        '2024-12-31',
        75
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].percentage).toBeLessThan(75);
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('markClassAttendance', () => {
    it('should mark attendance for all students in class', async () => {
      // Arrange
      const classData = {
        id: 'class-123',
        students: [
          testData.student({ id: 'student-1' }),
          testData.student({ id: 'student-2' }),
        ],
      };

      const attendanceRecords = [
        { studentId: 'student-1', status: 'present' },
        { studentId: 'student-2', status: 'absent' },
      ];

      models.Class.findByPk = jest.fn().mockResolvedValue(classData);
      models.Attendance.markAttendance = jest.fn()
        .mockResolvedValueOnce(testData.attendance({ studentId: 'student-1' }))
        .mockResolvedValueOnce(testData.attendance({ studentId: 'student-2' }));

      // Act
      const result = await attendanceService.markClassAttendance(
        'class-123',
        '2024-01-15',
        attendanceRecords,
        'teacher-123'
      );

      // Assert
      expect(result.markedCount).toBe(2);
      expect(models.Attendance.markAttendance).toHaveBeenCalledTimes(2);
    });
  });
});
