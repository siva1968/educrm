const express = require('express');
const router = express.Router();
const gradebookServiceController = require('../controllers/gradebook-service.controller');
const { validateBody, validateParams, validateQuery } = require('../../../shared/middleware/validator');
const validators = require('../validators/gradebook-service.validator');

// =============================================
// ROUTES
// =============================================

/**
 * @route   GET /api/v1/gradebookService
 * @desc    Get all records with pagination and filtering
 * @access  Private
 */
router.get('/',
  validateQuery(validators.querySchema),
  gradebookServiceController.getAll
);

/**
 * @route   GET /api/v1/gradebookService/stats
 * @desc    Get statistics
 * @access  Private
 */
router.get('/stats',
  gradebookServiceController.getStatistics
);

/**
 * @route   GET /api/v1/gradebookService/:id
 * @desc    Get record by ID
 * @access  Private
 */
router.get('/:id',
  validateParams(validators.idParamSchema),
  gradebookServiceController.getById
);

/**
 * @route   POST /api/v1/gradebookService
 * @desc    Create new record
 * @access  Private
 */
router.post('/',
  validateBody(validators.createSchema),
  gradebookServiceController.create
);

/**
 * @route   PUT /api/v1/gradebookService/:id
 * @desc    Update record
 * @access  Private
 */
router.put('/:id',
  validateParams(validators.idParamSchema),
  validateBody(validators.updateSchema),
  gradebookServiceController.update
);

/**
 * @route   DELETE /api/v1/gradebookService/:id
 * @desc    Delete record (soft delete)
 * @access  Private
 */
router.delete('/:id',
  validateParams(validators.idParamSchema),
  gradebookServiceController.delete
);

module.exports = router;
