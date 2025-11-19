const express = require('express');
const router = express.Router();
const lmsServiceController = require('../controllers/lms-service.controller');
const { validateBody, validateParams, validateQuery } = require('../../../shared/middleware/validator');
const validators = require('../validators/lms-service.validator');

// =============================================
// ROUTES
// =============================================

/**
 * @route   GET /api/v1/lmsService
 * @desc    Get all records with pagination and filtering
 * @access  Private
 */
router.get('/',
  validateQuery(validators.querySchema),
  lmsServiceController.getAll
);

/**
 * @route   GET /api/v1/lmsService/stats
 * @desc    Get statistics
 * @access  Private
 */
router.get('/stats',
  lmsServiceController.getStatistics
);

/**
 * @route   GET /api/v1/lmsService/:id
 * @desc    Get record by ID
 * @access  Private
 */
router.get('/:id',
  validateParams(validators.idParamSchema),
  lmsServiceController.getById
);

/**
 * @route   POST /api/v1/lmsService
 * @desc    Create new record
 * @access  Private
 */
router.post('/',
  validateBody(validators.createSchema),
  lmsServiceController.create
);

/**
 * @route   PUT /api/v1/lmsService/:id
 * @desc    Update record
 * @access  Private
 */
router.put('/:id',
  validateParams(validators.idParamSchema),
  validateBody(validators.updateSchema),
  lmsServiceController.update
);

/**
 * @route   DELETE /api/v1/lmsService/:id
 * @desc    Delete record (soft delete)
 * @access  Private
 */
router.delete('/:id',
  validateParams(validators.idParamSchema),
  lmsServiceController.delete
);

module.exports = router;
