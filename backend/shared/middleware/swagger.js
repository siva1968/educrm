const swaggerUi = require('swagger-ui-express');
const { generateSwaggerSpec } = require('../swagger/swagger-config');

/**
 * Swagger UI Middleware
 * Serves interactive API documentation
 */

const setupSwagger = (app, serviceName, version, port) => {
  const swaggerSpec = generateSwaggerSpec({
    serviceName: `${serviceName} API`,
    serviceDescription: `REST API for ${serviceName}`,
    version: version || '1.0.0',
    port: port,
    apis: ['./routes/*.js', './routes/**/*.js']
  });

  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: `${serviceName} API Documentation`,
  }));

  // JSON spec endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log(`📚 API Documentation available at: http://localhost:${port}/api-docs`);
};

module.exports = { setupSwagger };
