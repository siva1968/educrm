const express = require('express');
const router = express.Router();
const hrManagementServiceController = require('../controllers/hr-management-service.controller');
const { validateBody, validateParams, validateQuery } = require('../../../shared/middleware/validator');
const validators = require('../validators/hr-management-service.validator');

// =============================================
// ROUTES
// =============================================

/**
 * @route   GET /api/v1/hrManagementService
 * @desc    Get all records with pagination and filtering
 * @access  Private
 */
router.get('/',
  validateQuery(validators.querySchema),
  hrManagementServiceController.getAll
);

/**
 * @route   GET /api/v1/hrManagementService/stats
 * @desc    Get statistics
 * @access  Private
 */
router.get('/stats',
  hrManagementServiceController.getStatistics
);

/**
 * @route   GET /api/v1/hrManagementService/:id
 * @desc    Get record by ID
 * @access  Private
 */
router.get('/:id',
  validateParams(validators.idParamSchema),
  hrManagementServiceController.getById
);

/**
 * @route   POST /api/v1/hrManagementService
 * @desc    Create new record
 * @access  Private
 */
router.post('/',
  validateBody(validators.createSchema),
  hrManagementServiceController.create
);

/**
 * @route   PUT /api/v1/hrManagementService/:id
 * @desc    Update record
 * @access  Private
 */
router.put('/:id',
  validateParams(validators.idParamSchema),
  validateBody(validators.updateSchema),
  hrManagementServiceController.update
);

/**
 * @route   DELETE /api/v1/hrManagementService/:id
 * @desc    Delete record (soft delete)
 * @access  Private
 */
router.delete('/:id',
  validateParams(validators.idParamSchema),
  hrManagementServiceController.delete
);

module.exports = router;
