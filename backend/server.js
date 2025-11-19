const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const logger = require('./shared/utils/logger');
const errorHandler = require('./shared/middleware/errorHandler');
const { healthCheck } = require('./shared/config/database');

// Import service routes
const sisRoutes = require('./services/sis/routes');
const attendanceRoutes = require('./services/attendance/routes');
const gatePassRoutes = require('./services/gate-pass/routes');
const learnerProfileRoutes = require('./services/learner-profile/routes');
const loginStatsRoutes = require('./services/login-stats/routes');

// Initialize Express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Request logging middleware
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealth = await healthCheck();

  res.status(dbHealth.healthy ? 200 : 503).json({
    status: dbHealth.healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealth,
    environment: process.env.NODE_ENV || 'development',
  });
});

// API version info
app.get('/', (req, res) => {
  res.json({
    name: 'EduCRM Backend API',
    version: process.env.API_VERSION || 'v1',
    description: 'AI-Enabled Educational Management System',
    documentation: '/api-docs',
  });
});

// Mount service routes
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}/students`, sisRoutes);
app.use(`/api/${apiVersion}/attendance`, attendanceRoutes);
app.use(`/api/${apiVersion}/gate-pass`, gatePassRoutes);
app.use(`/api/${apiVersion}/learner-profile`, learnerProfileRoutes);
app.use(`/api/${apiVersion}/analytics`, loginStatsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: 'Route not found',
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server started on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 API URL: http://localhost:${PORT}/api/${apiVersion}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

module.exports = app;
