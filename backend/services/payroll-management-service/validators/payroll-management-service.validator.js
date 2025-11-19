const Joi = require('joi');

/**
 * Validation schemas for payroll-management-service
 */

const createSchema = Joi.object({
  name: Joi.string().required().trim().min(1).max(255),
  description: Joi.string().optional().allow('', null).max(1000),
  status: Joi.string().valid('active', 'inactive').default('active')
});

const updateSchema = Joi.object({
  name: Joi.string().optional().trim().min(1).max(255),
  description: Joi.string().optional().allow('', null).max(1000),
  status: Joi.string().valid('active', 'inactive')
}).min(1);

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
  status: Joi.string().valid('active', 'inactive'),
  search: Joi.string().max(100),
  sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid({ version: 'uuidv4' }).required()
});

module.exports = {
  createSchema,
  updateSchema,
  querySchema,
  idParamSchema
};
