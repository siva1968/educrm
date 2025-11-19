const express = require('express');
const router = express.Router();
const payrollManagementServiceController = require('../controllers/payroll-management-service.controller');
const { validateBody, validateParams, validateQuery } = require('../../../shared/middleware/validator');
const validators = require('../validators/payroll-management-service.validator');

// =============================================
// ROUTES
// =============================================

/**
 * @route   GET /api/v1/payrollManagementService
 * @desc    Get all records with pagination and filtering
 * @access  Private
 */
router.get('/',
  validateQuery(validators.querySchema),
  payrollManagementServiceController.getAll
);

/**
 * @route   GET /api/v1/payrollManagementService/stats
 * @desc    Get statistics
 * @access  Private
 */
router.get('/stats',
  payrollManagementServiceController.getStatistics
);

/**
 * @route   GET /api/v1/payrollManagementService/:id
 * @desc    Get record by ID
 * @access  Private
 */
router.get('/:id',
  validateParams(validators.idParamSchema),
  payrollManagementServiceController.getById
);

/**
 * @route   POST /api/v1/payrollManagementService
 * @desc    Create new record
 * @access  Private
 */
router.post('/',
  validateBody(validators.createSchema),
  payrollManagementServiceController.create
);

/**
 * @route   PUT /api/v1/payrollManagementService/:id
 * @desc    Update record
 * @access  Private
 */
router.put('/:id',
  validateParams(validators.idParamSchema),
  validateBody(validators.updateSchema),
  payrollManagementServiceController.update
);

/**
 * @route   DELETE /api/v1/payrollManagementService/:id
 * @desc    Delete record (soft delete)
 * @access  Private
 */
router.delete('/:id',
  validateParams(validators.idParamSchema),
  payrollManagementServiceController.delete
);

module.exports = router;
