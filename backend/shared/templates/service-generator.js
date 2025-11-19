/**
 * Service Template Generator
 * Creates production-ready microservices with all best practices
 *
 * Usage: node backend/shared/templates/service-generator.js <service-name> <port>
 */

const fs = require('fs');
const path = require('path');

const generateService = (serviceName, port, description) => {
  const serviceDir = path.join(__dirname, `../../services/${serviceName}`);

  // Create directories
  const dirs = ['', '/routes', '/controllers', '/services', '/validators', '/models', '/__tests__'];
  dirs.forEach(dir => {
    if (!fs.existsSync(serviceDir + dir)) {
      fs.mkdirSync(serviceDir + dir, { recursive: true });
    }
  });

  // Generate files
  generatePackageJson(serviceDir, serviceName, description);
  generateDockerfile(serviceDir, port);
  generateDockerignore(serviceDir);
  generateAppJs(serviceDir, serviceName, port);
  generateRoutes(serviceDir, serviceName);
  generateController(serviceDir, serviceName);
  generateServiceLayer(serviceDir, serviceName);
  generateValidator(serviceDir, serviceName);
  generateTest(serviceDir, serviceName);
  generateReadme(serviceDir, serviceName, port, description);

  console.log(`✅ Generated ${serviceName} at ${serviceDir}`);
};

const generatePackageJson = (dir, name, description) => {
  const content = {
    name: name,
    version: "1.0.0",
    description: description,
    main: "app.js",
    scripts: {
      start: "node app.js",
      dev: "nodemon app.js",
      test: "jest",
      "test:watch": "jest --watch",
      "test:coverage": "jest --coverage"
    },
    dependencies: {
      express: "^4.18.2",
      cors: "^2.8.5",
      helmet: "^7.1.0",
      morgan: "^1.10.0",
      joi: "^17.11.0",
      pg: "^8.11.3",
      redis: "^4.6.11",
      uuid: "^9.0.1",
      dotenv: "^16.3.1"
    },
    devDependencies: {
      nodemon: "^3.0.2",
      jest: "^29.7.0",
      "@types/jest": "^29.5.10"
    }
  };

  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(content, null, 2)
  );
};

const generateAppJs = (dir, serviceName, port) => {
  const camelName = toCamelCase(serviceName);
  const envVarName = toEnvVarName(serviceName);

  const content = `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const errorHandler = require('../../shared/middleware/errorHandler');
const { authenticate } = require('../../shared/middleware/auth');
const { standardLimiter } = require('../../shared/middleware/rateLimiter');

const app = express();
const PORT = process.env.${envVarName}_PORT || ${port};

// =============================================
// MIDDLEWARE
// =============================================

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
if (process.env.RATE_LIMIT_ENABLED === 'true') {
  app.use('/api/', standardLimiter);
}

// Request ID
app.use((req, res, next) => {
  req.id = require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// =============================================
// ROUTES
// =============================================

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({
    service: '${toTitleCase(serviceName)}',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes (with authentication)
app.use('/api/v1/${camelName}', authenticate, routes);

// =============================================
// ERROR HANDLING
// =============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Global error handler
app.use(errorHandler);

// =============================================
// GRACEFUL SHUTDOWN
// =============================================

let server;

const gracefulShutdown = (signal) => {
  console.log(\`\\n\${signal} received: closing server gracefully\`);
  if (server) {
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });

    // Force close after 10s
    setTimeout(() => {
      console.error('⚠️ Forced shutdown');
      process.exit(1);
    }, 10000);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================
// START SERVER
// =============================================

if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log('');
    console.log('============================================');
    console.log(\`   \${toTitleCase(serviceName)}\`);
    console.log('============================================');
    console.log(\`   Status: Running\`);
    console.log(\`   Port: \${PORT}\`);
    console.log(\`   Environment: \${process.env.NODE_ENV || 'development'}\`);
    console.log(\`   PID: \${process.pid}\`);
    console.log('');
    console.log('   📍 Endpoints:');
    console.log(\`      Health: http://localhost:\${PORT}/health\`);
    console.log(\`      API: http://localhost:\${PORT}/api/v1/${camelName}\`);
    console.log('');
    console.log('============================================');
    console.log('');
  });
}

module.exports = app;
`;

  fs.writeFileSync(path.join(dir, 'app.js'), content);
};

const generateDockerfile = (dir, port) => {
  const content = `# Multi-stage Docker build

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

FROM node:18-alpine
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder --chown=nodejs:nodejs /app .

USER nodejs
EXPOSE ${port}

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:${port}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "app.js"]
`;

  fs.writeFileSync(path.join(dir, 'Dockerfile'), content);
};

const generateDockerignore = (dir) => {
  const content = `node_modules
npm-debug.log
.env
.env.*
!.env.example
.git
.gitignore
README.md
.dockerignore
Dockerfile
coverage
.nyc_output
*.log
.DS_Store
__tests__
`;

  fs.writeFileSync(path.join(dir, '.dockerignore'), content);
};

const generateRoutes = (dir, serviceName) => {
  const camelName = toCamelCase(serviceName);
  const capitalizedName = serviceName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

  const content = `const express = require('express');
const router = express.Router();
const ${camelName}Controller = require('../controllers/${serviceName}.controller');
const { validateBody, validateParams, validateQuery } = require('../../../shared/middleware/validator');
const validators = require('../validators/${serviceName}.validator');

// =============================================
// ROUTES
// =============================================

/**
 * @route   GET /api/v1/${camelName}
 * @desc    Get all records with pagination and filtering
 * @access  Private
 */
router.get('/',
  validateQuery(validators.querySchema),
  ${camelName}Controller.getAll
);

/**
 * @route   GET /api/v1/${camelName}/stats
 * @desc    Get statistics
 * @access  Private
 */
router.get('/stats',
  ${camelName}Controller.getStatistics
);

/**
 * @route   GET /api/v1/${camelName}/:id
 * @desc    Get record by ID
 * @access  Private
 */
router.get('/:id',
  validateParams(validators.idParamSchema),
  ${camelName}Controller.getById
);

/**
 * @route   POST /api/v1/${camelName}
 * @desc    Create new record
 * @access  Private
 */
router.post('/',
  validateBody(validators.createSchema),
  ${camelName}Controller.create
);

/**
 * @route   PUT /api/v1/${camelName}/:id
 * @desc    Update record
 * @access  Private
 */
router.put('/:id',
  validateParams(validators.idParamSchema),
  validateBody(validators.updateSchema),
  ${camelName}Controller.update
);

/**
 * @route   DELETE /api/v1/${camelName}/:id
 * @desc    Delete record (soft delete)
 * @access  Private
 */
router.delete('/:id',
  validateParams(validators.idParamSchema),
  ${camelName}Controller.delete
);

module.exports = router;
`;

  fs.writeFileSync(path.join(dir, 'routes', 'index.js'), content);
};

const generateController = (dir, serviceName) => {
  const camelName = toCamelCase(serviceName);

  const content = `const ${camelName}Service = require('../services/${serviceName}.service');
const { formatPaginatedResponse } = require('../../../shared/utils/pagination');

class ${serviceName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Controller {
  /**
   * Get all records with pagination and filtering
   */
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 50, ...filters } = req.query;

      const result = await ${camelName}Service.getAll(filters, parseInt(page), parseInt(limit));

      res.json(formatPaginatedResponse(
        result.data,
        page,
        limit,
        result.total
      ));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get record by ID
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;

      const record = await ${camelName}Service.getById(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Record not found'
        });
      }

      res.json({
        success: true,
        data: record
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new record
   */
  async create(req, res, next) {
    try {
      const record = await ${camelName}Service.create(req.body);

      res.status(201).json({
        success: true,
        message: 'Record created successfully',
        data: record
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update record
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;

      const record = await ${camelName}Service.update(id, req.body);

      res.json({
        success: true,
        message: 'Record updated successfully',
        data: record
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete record (soft delete)
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;

      await ${camelName}Service.delete(id);

      res.json({
        success: true,
        message: 'Record deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(req, res, next) {
    try {
      const stats = await ${camelName}Service.getStatistics();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ${serviceName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Controller();
`;

  fs.writeFileSync(path.join(dir, 'controllers', `${serviceName}.controller.js`), content);
};

const generateServiceLayer = (dir, serviceName) => {
  const camelName = toCamelCase(serviceName);
  const tableName = serviceName.replace(/-/g, '_') + 's';

  const content = `const { query } = require('../../../shared/config/database');
const cache = require('../../../shared/utils/cache');
const { v4: uuidv4 } = require('uuid');

class ${serviceName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Service {
  /**
   * Get all records with pagination and filtering
   */
  async getAll(filters = {}, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const conditions = ['deleted_at IS NULL'];
    const values = [];
    let paramCount = 1;

    // Apply filters
    if (filters.status) {
      conditions.push(\`status = $\${paramCount}\`);
      values.push(filters.status);
      paramCount++;
    }

    if (filters.search) {
      conditions.push(\`(name ILIKE $\${paramCount})\`);
      values.push(\`%\${filters.search}%\`);
      paramCount++;
    }

    // Build queries
    const whereClause = conditions.join(' AND ');
    const countSql = \`SELECT COUNT(*) FROM ${tableName} WHERE \${whereClause}\`;
    const dataSql = \`
      SELECT * FROM ${tableName}
      WHERE \${whereClause}
      ORDER BY created_at DESC
      LIMIT $\${paramCount} OFFSET $\${paramCount + 1}
    \`;

    // Execute queries
    const countResult = await query(countSql, values);
    const dataResult = await query(dataSql, [...values, limit, offset]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }

  /**
   * Get record by ID with caching
   */
  async getById(id) {
    const cacheKey = \`${camelName}:\${id}\`;

    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const sql = \`
      SELECT * FROM ${tableName}
      WHERE id = $1 AND deleted_at IS NULL
    \`;

    const result = await query(sql, [id]);
    const record = result.rows[0] || null;

    // Cache result
    if (record) {
      await cache.set(cacheKey, record, 300); // 5 minutes
    }

    return record;
  }

  /**
   * Create new record
   */
  async create(data) {
    const id = uuidv4();

    const sql = \`
      INSERT INTO ${tableName} (id, name, status, created_at, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    \`;

    const values = [id, data.name, data.status || 'active'];

    const result = await query(sql, values);
    const record = result.rows[0];

    // Invalidate list cache
    await cache.invalidateResource('${camelName}');

    return record;
  }

  /**
   * Update record
   */
  async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic update
    const allowedFields = ['name', 'status'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(\`\${field} = $\${paramCount}\`);
        values.push(data[field]);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(\`updated_at = CURRENT_TIMESTAMP\`);
    values.push(id);

    const sql = \`
      UPDATE ${tableName}
      SET \${updates.join(', ')}
      WHERE id = $\${paramCount} AND deleted_at IS NULL
      RETURNING *
    \`;

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      throw new Error('Record not found');
    }

    const record = result.rows[0];

    // Invalidate caches
    await cache.del(\`${camelName}:\${id}\`);
    await cache.invalidateResource('${camelName}');

    return record;
  }

  /**
   * Soft delete record
   */
  async delete(id) {
    const sql = \`
      UPDATE ${tableName}
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    \`;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      throw new Error('Record not found');
    }

    // Invalidate caches
    await cache.del(\`${camelName}:\${id}\`);
    await cache.invalidateResource('${camelName}');

    return true;
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    const sql = \`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive
      FROM ${tableName}
      WHERE deleted_at IS NULL
    \`;

    const result = await query(sql);
    return result.rows[0];
  }
}

module.exports = new ${serviceName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Service();
`;

  fs.writeFileSync(path.join(dir, 'services', `${serviceName}.service.js`), content);
};

const generateValidator = (dir, serviceName) => {
  const content = `const Joi = require('joi');

/**
 * Validation schemas for ${serviceName}
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
`;

  fs.writeFileSync(path.join(dir, 'validators', `${serviceName}.validator.js`), content);
};

const generateTest = (dir, serviceName) => {
  const camelName = toCamelCase(serviceName);

  const content = `/**
 * Unit tests for ${serviceName} service
 */

const ${camelName}Service = require('../services/${serviceName}.service');
const { query } = require('../../../shared/config/database');

// Mock dependencies
jest.mock('../../../shared/config/database');
jest.mock('../../../shared/utils/cache', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  invalidateResource: jest.fn()
}));

describe('${serviceName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a record successfully', async () => {
      const mockRecord = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Record',
        status: 'active',
        created_at: new Date().toISOString()
      };

      query.mockResolvedValue({
        rows: [mockRecord]
      });

      const result = await ${camelName}Service.create({
        name: 'Test Record',
        status: 'active'
      });

      expect(result).toEqual(mockRecord);
      expect(query).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      query.mockRejectedValue(new Error('Database error'));

      await expect(
        ${camelName}Service.create({ name: 'Test' })
      ).rejects.toThrow('Database error');
    });
  });

  describe('getById', () => {
    it('should return record when found', async () => {
      const mockRecord = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Record'
      };

      query.mockResolvedValue({
        rows: [mockRecord]
      });

      const result = await ${camelName}Service.getById('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual(mockRecord);
    });

    it('should return null when record not found', async () => {
      query.mockResolvedValue({
        rows: []
      });

      const result = await ${camelName}Service.getById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return paginated records', async () => {
      const mockRecords = [
        { id: '1', name: 'Record 1' },
        { id: '2', name: 'Record 2' }
      ];

      // Mock count query
      query.mockResolvedValueOnce({
        rows: [{ count: '10' }]
      });

      // Mock data query
      query.mockResolvedValueOnce({
        rows: mockRecords
      });

      const result = await ${camelName}Service.getAll({}, 1, 50);

      expect(result.data).toEqual(mockRecords);
      expect(result.total).toBe(10);
      expect(query).toHaveBeenCalledTimes(2);
    });

    it('should apply filters correctly', async () => {
      query.mockResolvedValueOnce({
        rows: [{ count: '5' }]
      });

      query.mockResolvedValueOnce({
        rows: []
      });

      await ${camelName}Service.getAll({ status: 'active' }, 1, 50);

      const sqlCall = query.mock.calls[0][0];
      expect(sqlCall).toContain('status = $1');
    });
  });

  describe('update', () => {
    it('should update record successfully', async () => {
      const mockUpdatedRecord = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Updated Name'
      };

      query.mockResolvedValue({
        rows: [mockUpdatedRecord]
      });

      const result = await ${camelName}Service.update(
        '123e4567-e89b-12d3-a456-426614174000',
        { name: 'Updated Name' }
      );

      expect(result).toEqual(mockUpdatedRecord);
    });

    it('should throw error when record not found', async () => {
      query.mockResolvedValue({
        rows: []
      });

      await expect(
        ${camelName}Service.update('non-existent-id', { name: 'Test' })
      ).rejects.toThrow('Record not found');
    });

    it('should throw error when no valid fields provided', async () => {
      await expect(
        ${camelName}Service.update('123e4567-e89b-12d3-a456-426614174000', {})
      ).rejects.toThrow('No valid fields to update');
    });
  });

  describe('delete', () => {
    it('should soft delete record successfully', async () => {
      query.mockResolvedValue({
        rows: [{ id: '123e4567-e89b-12d3-a456-426614174000' }]
      });

      const result = await ${camelName}Service.delete('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toBe(true);
      expect(query).toHaveBeenCalled();
    });

    it('should throw error when record not found', async () => {
      query.mockResolvedValue({
        rows: []
      });

      await expect(
        ${camelName}Service.delete('non-existent-id')
      ).rejects.toThrow('Record not found');
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      const mockStats = {
        total: '100',
        active: '80',
        inactive: '20'
      };

      query.mockResolvedValue({
        rows: [mockStats]
      });

      const result = await ${camelName}Service.getStatistics();

      expect(result).toEqual(mockStats);
    });
  });
});
`;

  fs.writeFileSync(path.join(dir, '__tests__', `${serviceName}.service.test.js`), content);
};

const generateReadme = (dir, serviceName, port, description) => {
  const titleName = toTitleCase(serviceName);
  const camelName = toCamelCase(serviceName);

  const content = `# ${titleName}

${description}

## Overview

Production-ready microservice with:
- ✅ PostgreSQL database integration
- ✅ Redis caching
- ✅ Joi validation
- ✅ JWT authentication
- ✅ Rate limiting
- ✅ Comprehensive testing
- ✅ Docker support
- ✅ Health checks
- ✅ Graceful shutdown

## Endpoints

### Health Check
\`\`\`
GET /health
\`\`\`

### API Endpoints (Authenticated)

\`\`\`
GET    /api/v1/${camelName}           - Get all records (paginated)
GET    /api/v1/${camelName}/stats     - Get statistics
GET    /api/v1/${camelName}/:id       - Get record by ID
POST   /api/v1/${camelName}           - Create new record
PUT    /api/v1/${camelName}/:id       - Update record
DELETE /api/v1/${camelName}/:id       - Delete record (soft delete)
\`\`\`

## Installation

\`\`\`bash
npm install
\`\`\`

## Environment Variables

\`\`\`bash
${toEnvVarName(serviceName)}_PORT=${port}
DB_HOST=localhost
DB_PORT=5432
DB_NAME=educrm
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_secret_key
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Testing

\`\`\`bash
npm test                # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
\`\`\`

## Docker

\`\`\`bash
docker build -t ${serviceName} .
docker run -p ${port}:${port} ${serviceName}
\`\`\`

## Production

\`\`\`bash
npm start
\`\`\`
`;

  fs.writeFileSync(path.join(dir, 'README.md'), content);
};

// Helper functions
const toCamelCase = (str) => str.replace(/-./g, x => x[1].toUpperCase());
const toTitleCase = (str) => str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
const toEnvVarName = (str) => str.toUpperCase().replace(/-/g, '_');

module.exports = { generateService };
