const express = require('express');
const router = express.Router();
const attendanceManagementServiceController = require('../controllers/attendance-management-service.controller');
const { validateBody, validateParams, validateQuery } = require('../../../shared/middleware/validator');
const validators = require('../validators/attendance-management-service.validator');

// =============================================
// ROUTES
// =============================================

/**
 * @route   GET /api/v1/attendanceManagementService
 * @desc    Get all records with pagination and filtering
 * @access  Private
 */
router.get('/',
  validateQuery(validators.querySchema),
  attendanceManagementServiceController.getAll
);

/**
 * @route   GET /api/v1/attendanceManagementService/stats
 * @desc    Get statistics
 * @access  Private
 */
router.get('/stats',
  attendanceManagementServiceController.getStatistics
);

/**
 * @route   GET /api/v1/attendanceManagementService/:id
 * @desc    Get record by ID
 * @access  Private
 */
router.get('/:id',
  validateParams(validators.idParamSchema),
  attendanceManagementServiceController.getById
);

/**
 * @route   POST /api/v1/attendanceManagementService
 * @desc    Create new record
 * @access  Private
 */
router.post('/',
  validateBody(validators.createSchema),
  attendanceManagementServiceController.create
);

/**
 * @route   PUT /api/v1/attendanceManagementService/:id
 * @desc    Update record
 * @access  Private
 */
router.put('/:id',
  validateParams(validators.idParamSchema),
  validateBody(validators.updateSchema),
  attendanceManagementServiceController.update
);

/**
 * @route   DELETE /api/v1/attendanceManagementService/:id
 * @desc    Delete record (soft delete)
 * @access  Private
 */
router.delete('/:id',
  validateParams(validators.idParamSchema),
  attendanceManagementServiceController.delete
);

module.exports = router;
