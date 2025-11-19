const express = require('express');
const router = express.Router();
const onlineClassesServiceController = require('../controllers/online-classes-service.controller');
const { validateBody, validateParams, validateQuery } = require('../../../shared/middleware/validator');
const validators = require('../validators/online-classes-service.validator');

// =============================================
// ROUTES
// =============================================

/**
 * @route   GET /api/v1/onlineClassesService
 * @desc    Get all records with pagination and filtering
 * @access  Private
 */
router.get('/',
  validateQuery(validators.querySchema),
  onlineClassesServiceController.getAll
);

/**
 * @route   GET /api/v1/onlineClassesService/stats
 * @desc    Get statistics
 * @access  Private
 */
router.get('/stats',
  onlineClassesServiceController.getStatistics
);

/**
 * @route   GET /api/v1/onlineClassesService/:id
 * @desc    Get record by ID
 * @access  Private
 */
router.get('/:id',
  validateParams(validators.idParamSchema),
  onlineClassesServiceController.getById
);

/**
 * @route   POST /api/v1/onlineClassesService
 * @desc    Create new record
 * @access  Private
 */
router.post('/',
  validateBody(validators.createSchema),
  onlineClassesServiceController.create
);

/**
 * @route   PUT /api/v1/onlineClassesService/:id
 * @desc    Update record
 * @access  Private
 */
router.put('/:id',
  validateParams(validators.idParamSchema),
  validateBody(validators.updateSchema),
  onlineClassesServiceController.update
);

/**
 * @route   DELETE /api/v1/onlineClassesService/:id
 * @desc    Delete record (soft delete)
 * @access  Private
 */
router.delete('/:id',
  validateParams(validators.idParamSchema),
  onlineClassesServiceController.delete
);

module.exports = router;
