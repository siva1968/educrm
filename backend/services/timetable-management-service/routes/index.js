const express = require('express');
const router = express.Router();
const timetableManagementServiceController = require('../controllers/timetable-management-service.controller');
const { validateBody, validateParams, validateQuery } = require('../../../shared/middleware/validator');
const validators = require('../validators/timetable-management-service.validator');

// =============================================
// ROUTES
// =============================================

/**
 * @route   GET /api/v1/timetableManagementService
 * @desc    Get all records with pagination and filtering
 * @access  Private
 */
router.get('/',
  validateQuery(validators.querySchema),
  timetableManagementServiceController.getAll
);

/**
 * @route   GET /api/v1/timetableManagementService/stats
 * @desc    Get statistics
 * @access  Private
 */
router.get('/stats',
  timetableManagementServiceController.getStatistics
);

/**
 * @route   GET /api/v1/timetableManagementService/:id
 * @desc    Get record by ID
 * @access  Private
 */
router.get('/:id',
  validateParams(validators.idParamSchema),
  timetableManagementServiceController.getById
);

/**
 * @route   POST /api/v1/timetableManagementService
 * @desc    Create new record
 * @access  Private
 */
router.post('/',
  validateBody(validators.createSchema),
  timetableManagementServiceController.create
);

/**
 * @route   PUT /api/v1/timetableManagementService/:id
 * @desc    Update record
 * @access  Private
 */
router.put('/:id',
  validateParams(validators.idParamSchema),
  validateBody(validators.updateSchema),
  timetableManagementServiceController.update
);

/**
 * @route   DELETE /api/v1/timetableManagementService/:id
 * @desc    Delete record (soft delete)
 * @access  Private
 */
router.delete('/:id',
  validateParams(validators.idParamSchema),
  timetableManagementServiceController.delete
);

module.exports = router;
