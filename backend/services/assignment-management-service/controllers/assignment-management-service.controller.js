const assignmentManagementServiceService = require('../services/assignment-management-service.service');
const { formatPaginatedResponse } = require('../../../shared/utils/pagination');

class AssignmentManagementServiceController {
  /**
   * Get all records with pagination and filtering
   */
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 50, ...filters } = req.query;

      const result = await assignmentManagementServiceService.getAll(filters, parseInt(page), parseInt(limit));

      res.json(formatPaginatedResponse(
        result.data,
        page,
        limit,
        result.total
      ));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get record by ID
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;

      const record = await assignmentManagementServiceService.getById(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Record not found'
        });
      }

      res.json({
        success: true,
        data: record
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new record
   */
  async create(req, res, next) {
    try {
      const record = await assignmentManagementServiceService.create(req.body);

      res.status(201).json({
        success: true,
        message: 'Record created successfully',
        data: record
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update record
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;

      const record = await assignmentManagementServiceService.update(id, req.body);

      res.json({
        success: true,
        message: 'Record updated successfully',
        data: record
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete record (soft delete)
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;

      await assignmentManagementServiceService.delete(id);

      res.json({
        success: true,
        message: 'Record deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(req, res, next) {
    try {
      const stats = await assignmentManagementServiceService.getStatistics();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AssignmentManagementServiceController();
