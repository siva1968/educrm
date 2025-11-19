const express = require('express');
const router = express.Router();
const assignmentManagementServiceController = require('../controllers/assignment-management-service.controller');
const { validateBody, validateParams, validateQuery } = require('../../../shared/middleware/validator');
const validators = require('../validators/assignment-management-service.validator');

// =============================================
// ROUTES
// =============================================

/**
 * @route   GET /api/v1/assignmentManagementService
 * @desc    Get all records with pagination and filtering
 * @access  Private
 */
router.get('/',
  validateQuery(validators.querySchema),
  assignmentManagementServiceController.getAll
);

/**
 * @route   GET /api/v1/assignmentManagementService/stats
 * @desc    Get statistics
 * @access  Private
 */
router.get('/stats',
  assignmentManagementServiceController.getStatistics
);

/**
 * @route   GET /api/v1/assignmentManagementService/:id
 * @desc    Get record by ID
 * @access  Private
 */
router.get('/:id',
  validateParams(validators.idParamSchema),
  assignmentManagementServiceController.getById
);

/**
 * @route   POST /api/v1/assignmentManagementService
 * @desc    Create new record
 * @access  Private
 */
router.post('/',
  validateBody(validators.createSchema),
  assignmentManagementServiceController.create
);

/**
 * @route   PUT /api/v1/assignmentManagementService/:id
 * @desc    Update record
 * @access  Private
 */
router.put('/:id',
  validateParams(validators.idParamSchema),
  validateBody(validators.updateSchema),
  assignmentManagementServiceController.update
);

/**
 * @route   DELETE /api/v1/assignmentManagementService/:id
 * @desc    Delete record (soft delete)
 * @access  Private
 */
router.delete('/:id',
  validateParams(validators.idParamSchema),
  assignmentManagementServiceController.delete
);

module.exports = router;
