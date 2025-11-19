const express = require('express');
const router = express.Router();
const feeManagementServiceController = require('../controllers/fee-management-service.controller');
const { validateBody, validateParams, validateQuery } = require('../../../shared/middleware/validator');
const validators = require('../validators/fee-management-service.validator');

// =============================================
// ROUTES
// =============================================

/**
 * @route   GET /api/v1/feeManagementService
 * @desc    Get all records with pagination and filtering
 * @access  Private
 */
router.get('/',
  validateQuery(validators.querySchema),
  feeManagementServiceController.getAll
);

/**
 * @route   GET /api/v1/feeManagementService/stats
 * @desc    Get statistics
 * @access  Private
 */
router.get('/stats',
  feeManagementServiceController.getStatistics
);

/**
 * @route   GET /api/v1/feeManagementService/:id
 * @desc    Get record by ID
 * @access  Private
 */
router.get('/:id',
  validateParams(validators.idParamSchema),
  feeManagementServiceController.getById
);

/**
 * @route   POST /api/v1/feeManagementService
 * @desc    Create new record
 * @access  Private
 */
router.post('/',
  validateBody(validators.createSchema),
  feeManagementServiceController.create
);

/**
 * @route   PUT /api/v1/feeManagementService/:id
 * @desc    Update record
 * @access  Private
 */
router.put('/:id',
  validateParams(validators.idParamSchema),
  validateBody(validators.updateSchema),
  feeManagementServiceController.update
);

/**
 * @route   DELETE /api/v1/feeManagementService/:id
 * @desc    Delete record (soft delete)
 * @access  Private
 */
router.delete('/:id',
  validateParams(validators.idParamSchema),
  feeManagementServiceController.delete
);

module.exports = router;
