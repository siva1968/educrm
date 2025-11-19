/**
 * Unit tests for timetable-management-service service
 */

const timetableManagementServiceService = require('../services/timetable-management-service.service');
const { query } = require('../../../shared/config/database');

// Mock dependencies
jest.mock('../../../shared/config/database');
jest.mock('../../../shared/utils/cache', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  invalidateResource: jest.fn()
}));

describe('TimetableManagementServiceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a record successfully', async () => {
      const mockRecord = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Record',
        status: 'active',
        created_at: new Date().toISOString()
      };

      query.mockResolvedValue({
        rows: [mockRecord]
      });

      const result = await timetableManagementServiceService.create({
        name: 'Test Record',
        status: 'active'
      });

      expect(result).toEqual(mockRecord);
      expect(query).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      query.mockRejectedValue(new Error('Database error'));

      await expect(
        timetableManagementServiceService.create({ name: 'Test' })
      ).rejects.toThrow('Database error');
    });
  });

  describe('getById', () => {
    it('should return record when found', async () => {
      const mockRecord = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Record'
      };

      query.mockResolvedValue({
        rows: [mockRecord]
      });

      const result = await timetableManagementServiceService.getById('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual(mockRecord);
    });

    it('should return null when record not found', async () => {
      query.mockResolvedValue({
        rows: []
      });

      const result = await timetableManagementServiceService.getById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return paginated records', async () => {
      const mockRecords = [
        { id: '1', name: 'Record 1' },
        { id: '2', name: 'Record 2' }
      ];

      // Mock count query
      query.mockResolvedValueOnce({
        rows: [{ count: '10' }]
      });

      // Mock data query
      query.mockResolvedValueOnce({
        rows: mockRecords
      });

      const result = await timetableManagementServiceService.getAll({}, 1, 50);

      expect(result.data).toEqual(mockRecords);
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

      await timetableManagementServiceService.getAll({ status: 'active' }, 1, 50);

      const sqlCall = query.mock.calls[0][0];
      expect(sqlCall).toContain('status = $1');
    });
  });

  describe('update', () => {
    it('should update record successfully', async () => {
      const mockUpdatedRecord = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Updated Name'
      };

      query.mockResolvedValue({
        rows: [mockUpdatedRecord]
      });

      const result = await timetableManagementServiceService.update(
        '123e4567-e89b-12d3-a456-426614174000',
        { name: 'Updated Name' }
      );

      expect(result).toEqual(mockUpdatedRecord);
    });

    it('should throw error when record not found', async () => {
      query.mockResolvedValue({
        rows: []
      });

      await expect(
        timetableManagementServiceService.update('non-existent-id', { name: 'Test' })
      ).rejects.toThrow('Record not found');
    });

    it('should throw error when no valid fields provided', async () => {
      await expect(
        timetableManagementServiceService.update('123e4567-e89b-12d3-a456-426614174000', {})
      ).rejects.toThrow('No valid fields to update');
    });
  });

  describe('delete', () => {
    it('should soft delete record successfully', async () => {
      query.mockResolvedValue({
        rows: [{ id: '123e4567-e89b-12d3-a456-426614174000' }]
      });

      const result = await timetableManagementServiceService.delete('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toBe(true);
      expect(query).toHaveBeenCalled();
    });

    it('should throw error when record not found', async () => {
      query.mockResolvedValue({
        rows: []
      });

      await expect(
        timetableManagementServiceService.delete('non-existent-id')
      ).rejects.toThrow('Record not found');
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      const mockStats = {
        total: '100',
        active: '80',
        inactive: '20'
      };

      query.mockResolvedValue({
        rows: [mockStats]
      });

      const result = await timetableManagementServiceService.getStatistics();

      expect(result).toEqual(mockStats);
    });
  });
});
