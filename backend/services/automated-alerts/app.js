const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const alertRoutes = require('./routes');
const errorHandler = require('../../shared/middleware/errorHandler');

const app = express();
const PORT = process.env.ALERTS_PORT || 3013;

// =============================================
// MIDDLEWARE
// =============================================

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// =============================================
// ROUTES
// =============================================

// Root health check
app.get('/', (req, res) => {
  res.json({
    service: 'Automated Alerts Service',
    status: 'Running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Alert routes
app.use('/api/v1/alerts', alertRoutes);

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
// SERVER
// =============================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🔔 Automated Alerts Service running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/v1/alerts/health`);
  });
}

module.exports = app;
