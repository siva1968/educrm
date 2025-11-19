const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mobileService = require('./services/mobile.service');
const errorHandler = require('../../shared/middleware/errorHandler');

const app = express();
const PORT = process.env.MOBILE_API_PORT || 4007;

// =============================================
// MIDDLEWARE
// =============================================

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', credentials: true }));
app.use(compression()); // Enable response compression
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500 // 500 requests per window
});
app.use(limiter);

// =============================================
// MOBILE API ROUTES
// =============================================

app.get('/', (req, res) => {
  res.json({
    service: 'Mobile API Layer',
    status: 'Running',
    version: '1.0.0',
    description: 'Optimized API endpoints for mobile applications',
    features: ['Offline sync', 'Data optimization', 'Caching', 'Batch operations', 'Push notifications']
  });
});

// Student Dashboard
app.get('/api/v1/mobile/student/dashboard/:studentId', async (req, res, next) => {
  try {
    const data = await mobileService.getStudentDashboard(req.params.studentId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Teacher Dashboard
app.get('/api/v1/mobile/teacher/dashboard/:teacherId', async (req, res, next) => {
  try {
    const data = await mobileService.getTeacherDashboard(req.params.teacherId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Offline sync
app.post('/api/v1/mobile/sync/queue', async (req, res, next) => {
  try {
    const { userId, action } = req.body;
    const result = await mobileService.queueOfflineAction(userId, action);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/mobile/sync/process/:userId', async (req, res, next) => {
  try {
    const result = await mobileService.processSyncQueue(req.params.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Batch operations
app.post('/api/v1/mobile/batch', async (req, res, next) => {
  try {
    const { requests } = req.body;
    const results = await mobileService.batchFetch(requests);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

// Device management
app.post('/api/v1/mobile/device/register', async (req, res, next) => {
  try {
    const { userId, deviceInfo } = req.body;
    const result = await mobileService.registerDevice(userId, deviceInfo);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Health check
app.get('/api/v1/mobile/health', (req, res) => {
  res.json({
    service: 'Mobile API Layer',
    status: 'Active',
    version: '1.0.0',
    features: {
      offlineSync: true,
      dataOptimization: true,
      caching: true,
      compression: true,
      rateLimit: '500 req/15min'
    },
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

// =============================================
// START SERVER
// =============================================

let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`\n📱 Mobile API Layer running on port ${PORT}`);
    console.log(`   Features: Offline sync, Data optimization, Caching\n`);
  });
}

module.exports = app;
