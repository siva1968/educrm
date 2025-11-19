/**
 * Swagger/OpenAPI Configuration
 * Centralized API documentation setup for all microservices
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Generate Swagger documentation for a service
 * @param {Object} options - Service-specific options
 * @param {string} options.serviceName - Name of the service
 * @param {string} options.serviceDescription - Description of the service
 * @param {string} options.version - API version
 * @param {number} options.port - Service port
 * @param {string[]} options.apis - Paths to API route files
 * @returns {Object} Swagger specification
 */
function generateSwaggerSpec(options) {
  const {
    serviceName,
    serviceDescription,
    version = '1.0.0',
    port,
    apis = []
  } = options;

  const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: serviceName,
      version,
      description: serviceDescription,
      contact: {
        name: 'API Support',
        email: 'support@educrm.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Development server'
      },
      {
        url: `https://api.educrm.com`,
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation successful'
            },
            data: {
              type: 'object'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1
            },
            limit: {
              type: 'integer',
              example: 20
            },
            total: {
              type: 'integer',
              example: 100
            },
            pages: {
              type: 'integer',
              example: 5
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ValidationError: {
          description: 'Invalid input data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          }
        },
        SchoolIdParam: {
          name: 'school_id',
          in: 'query',
          description: 'School ID for filtering',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ],
    tags: []
  };

  const options = {
    definition: swaggerDefinition,
    apis: apis.length > 0 ? apis : ['./routes/*.js']
  };

  return swaggerJsdoc(options);
}

/**
 * Setup Swagger UI for Express app
 * @param {Object} app - Express app instance
 * @param {Object} spec - Swagger specification
 * @param {string} basePath - Base path for Swagger UI (default: '/api-docs')
 */
function setupSwaggerUI(app, spec, basePath = '/api-docs') {
  const options = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: spec.info.title,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true
    }
  };

  // Serve Swagger UI
  app.use(basePath, swaggerUi.serve, swaggerUi.setup(spec, options));

  // Serve Swagger JSON
  app.get(`${basePath}.json`, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(spec);
  });

  console.log(`📚 API Documentation available at: http://localhost:${spec.servers[0].url.split(':')[2]}${basePath}`);
}

/**
 * Common Swagger annotations examples
 */
const examples = {
  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Health check endpoint
   *     tags: [Health]
   *     security: []
   *     responses:
   *       200:
   *         description: Service is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 service:
   *                   type: string
   *                   example: "Service Name"
   *                 status:
   *                   type: string
   *                   example: "Active"
   *                 version:
   *                   type: string
   *                   example: "1.0.0"
   */
  healthCheck: null,

  /**
   * @swagger
   * /api/v1/resource:
   *   post:
   *     summary: Create new resource
   *     tags: [Resource]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Resource name"
   *     responses:
   *       201:
   *         description: Resource created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  createResource: null,

  /**
   * @swagger
   * /api/v1/resource:
   *   get:
   *     summary: List resources
   *     tags: [Resource]
   *     parameters:
   *       - $ref: '#/components/parameters/PageParam'
   *       - $ref: '#/components/parameters/LimitParam'
   *       - $ref: '#/components/parameters/SchoolIdParam'
   *     responses:
   *       200:
   *         description: List of resources
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     items:
   *                       type: array
   *                       items:
   *                         type: object
   *                     pagination:
   *                       $ref: '#/components/schemas/Pagination'
   */
  listResource: null
};

module.exports = {
  generateSwaggerSpec,
  setupSwaggerUI,
  examples
};
