const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const errorHandler = require('../../shared/middleware/errorHandler');
const { authenticate } = require('../../shared/middleware/auth');
const { standardLimiter } = require('../../shared/middleware/rateLimiter');

const app = express();
const PORT = process.env.LMS_SERVICE_PORT || 4115;

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
    service: 'Lms Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes (with authentication)
app.use('/api/v1/lmsService', authenticate, routes);

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
  console.log(`\n${signal} received: closing server gracefully`);
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
    console.log(`   ${toTitleCase(serviceName)}`);
    console.log('============================================');
    console.log(`   Status: Running`);
    console.log(`   Port: ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   PID: ${process.pid}`);
    console.log('');
    console.log('   📍 Endpoints:');
    console.log(`      Health: http://localhost:${PORT}/health`);
    console.log(`      API: http://localhost:${PORT}/api/v1/lmsService`);
    console.log('');
    console.log('============================================');
    console.log('');
  });
}

module.exports = app;
