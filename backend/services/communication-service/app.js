const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const communicationRoutes = require('./routes');
const errorHandler = require('../../shared/middleware/errorHandler');

const app = express();
const PORT = process.env.COMMUNICATION_SERVICE_PORT || 4005;

// =============================================
// MIDDLEWARE
// =============================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Request ID middleware
app.use((req, res, next) => {
  req.id = require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// =============================================
// ROOT ENDPOINT
// =============================================

app.get('/', (req, res) => {
  res.json({
    service: 'Communication Integration Service',
    status: 'Running',
    version: '1.0.0',
    description: 'Unified communication platform for SMS, Email, WhatsApp, and Push Notifications',
    providers: {
      sms: {
        provider: 'Twilio',
        features: ['Single message', 'Bulk messaging', 'Delivery tracking', 'Scheduled messages'],
        status: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'not-configured'
      },
      email: {
        provider: 'SendGrid',
        features: ['Single email', 'Bulk email', 'Templates', 'Attachments', 'Tracking'],
        status: process.env.SENDGRID_API_KEY ? 'configured' : 'not-configured'
      },
      whatsapp: {
        provider: 'WhatsApp Business API',
        features: ['Text messages', 'Template messages', 'Bulk messaging', 'Media messages'],
        status: process.env.WHATSAPP_API_TOKEN ? 'configured' : 'not-configured'
      },
      push: {
        provider: 'Firebase Cloud Messaging',
        features: ['Single device', 'Multicast', 'Topic messaging', 'Rich notifications'],
        status: process.env.FIREBASE_SERVICE_ACCOUNT_PATH ? 'configured' : 'not-configured'
      }
    },
    endpoints: {
      health: '/api/v1/communication/health',
      capabilities: '/api/v1/communication/capabilities',
      status: '/api/v1/communication/status',
      sms: 'POST /api/v1/communication/sms/send',
      email: 'POST /api/v1/communication/email/send',
      whatsapp: 'POST /api/v1/communication/whatsapp/send',
      push: 'POST /api/v1/communication/push/send',
      multiChannel: 'POST /api/v1/communication/multi-channel'
    },
    timestamp: new Date().toISOString()
  });
});

// =============================================
// API ROUTES
// =============================================

app.use('/api/v1/communication', communicationRoutes);

// =============================================
// METRICS ENDPOINT (for Prometheus)
// =============================================

let requestCount = 0;
let errorCount = 0;
let processingTime = [];
let smsSent = 0;
let emailsSent = 0;
let whatsappSent = 0;
let pushSent = 0;

app.use((req, res, next) => {
  const start = Date.now();
  requestCount++;

  // Track operation types
  if (req.path.includes('/sms/')) smsSent++;
  if (req.path.includes('/email/')) emailsSent++;
  if (req.path.includes('/whatsapp/')) whatsappSent++;
  if (req.path.includes('/push/')) pushSent++;

  res.on('finish', () => {
    const duration = Date.now() - start;
    processingTime.push(duration);

    // Keep only last 1000 measurements
    if (processingTime.length > 1000) {
      processingTime.shift();
    }

    if (res.statusCode >= 500) {
      errorCount++;
    }
  });

  next();
});

app.get('/metrics', (req, res) => {
  const avgProcessingTime = processingTime.length > 0
    ? processingTime.reduce((a, b) => a + b, 0) / processingTime.length
    : 0;

  const metrics = {
    // Service metrics
    communication_service_up: 1,
    communication_requests_total: requestCount,
    communication_errors_total: errorCount,
    communication_request_duration_ms: Math.round(avgProcessingTime),

    // Business metrics
    communication_sms_sent_total: smsSent,
    communication_emails_sent_total: emailsSent,
    communication_whatsapp_sent_total: whatsappSent,
    communication_push_sent_total: pushSent
  };

  // Prometheus format
  let prometheusMetrics = '';
  for (const [key, value] of Object.entries(metrics)) {
    prometheusMetrics += `${key} ${value}\n`;
  }

  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics);
});

// =============================================
// ERROR HANDLING
// =============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    service: 'communication-service'
  });
});

// Global error handler
app.use(errorHandler);

// =============================================
// GRACEFUL SHUTDOWN
// =============================================

process.on('SIGTERM', () => {
  console.log('📊 SIGTERM signal received: closing Communication service gracefully');
  server.close(() => {
    console.log('✅ Communication service closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📊 SIGINT signal received: closing Communication service gracefully');
  server.close(() => {
    console.log('✅ Communication service closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// =============================================
// START SERVER
// =============================================

let server;

if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log('');
    console.log('📨 ============================================');
    console.log('   Communication Integration Service');
    console.log('   ============================================');
    console.log(`   Status: Running`);
    console.log(`   Port: ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   PID: ${process.pid}`);
    console.log('');
    console.log('   📍 Endpoints:');
    console.log(`      Health: http://localhost:${PORT}/api/v1/communication/health`);
    console.log(`      Capabilities: http://localhost:${PORT}/api/v1/communication/capabilities`);
    console.log(`      Metrics: http://localhost:${PORT}/metrics`);
    console.log('');
    console.log('   🎯 Providers:');
    console.log(`      SMS: Twilio - ${process.env.TWILIO_ACCOUNT_SID ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`      Email: SendGrid - ${process.env.SENDGRID_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`      WhatsApp: Business API - ${process.env.WHATSAPP_API_TOKEN ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`      Push: Firebase CM - ${process.env.FIREBASE_SERVICE_ACCOUNT_PATH ? '✓ Configured' : '✗ Not configured'}`);
    console.log('');
    console.log('   ✉️  Features:');
    console.log('      ✓ SMS messaging with delivery tracking');
    console.log('      ✓ Email with templates and attachments');
    console.log('      ✓ WhatsApp messaging with templates');
    console.log('      ✓ Push notifications (single, multicast, topic)');
    console.log('      ✓ Multi-channel broadcasting');
    console.log('      ✓ Bulk messaging capabilities');
    console.log('');
    console.log('============================================ 📨');
    console.log('');
  });
}

module.exports = app;
