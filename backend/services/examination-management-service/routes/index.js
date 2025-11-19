const express = require('express');
const router = express.Router();
const examinationManagementServiceController = require('../controllers/examination-management-service.controller');
const { validateBody, validateParams, validateQuery } = require('../../../shared/middleware/validator');
const validators = require('../validators/examination-management-service.validator');

// =============================================
// ROUTES
// =============================================

/**
 * @route   GET /api/v1/examinationManagementService
 * @desc    Get all records with pagination and filtering
 * @access  Private
 */
router.get('/',
  validateQuery(validators.querySchema),
  examinationManagementServiceController.getAll
);

/**
 * @route   GET /api/v1/examinationManagementService/stats
 * @desc    Get statistics
 * @access  Private
 */
router.get('/stats',
  examinationManagementServiceController.getStatistics
);

/**
 * @route   GET /api/v1/examinationManagementService/:id
 * @desc    Get record by ID
 * @access  Private
 */
router.get('/:id',
  validateParams(validators.idParamSchema),
  examinationManagementServiceController.getById
);

/**
 * @route   POST /api/v1/examinationManagementService
 * @desc    Create new record
 * @access  Private
 */
router.post('/',
  validateBody(validators.createSchema),
  examinationManagementServiceController.create
);

/**
 * @route   PUT /api/v1/examinationManagementService/:id
 * @desc    Update record
 * @access  Private
 */
router.put('/:id',
  validateParams(validators.idParamSchema),
  validateBody(validators.updateSchema),
  examinationManagementServiceController.update
);

/**
 * @route   DELETE /api/v1/examinationManagementService/:id
 * @desc    Delete record (soft delete)
 * @access  Private
 */
router.delete('/:id',
  validateParams(validators.idParamSchema),
  examinationManagementServiceController.delete
);

module.exports = router;
