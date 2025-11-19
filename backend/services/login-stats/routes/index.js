const express = require('express');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

// Session management
router.post('/sessions/start', analyticsController.startSession.bind(analyticsController));
router.post('/sessions/end', analyticsController.endSession.bind(analyticsController));
router.get('/sessions/active', analyticsController.getActiveSessions.bind(analyticsController));

// Activity logging
router.post('/activity', analyticsController.logActivity.bind(analyticsController));

// Statistics and reports
router.get('/usage', analyticsController.getUsageStatistics.bind(analyticsController));
router.get('/engagement', analyticsController.getUserEngagement.bind(analyticsController));
router.get('/features', analyticsController.getFeatureUsage.bind(analyticsController));
router.get('/api-performance', analyticsController.getAPIPerformance.bind(analyticsController));

// Dashboard
router.get('/dashboard', analyticsController.getDashboard.bind(analyticsController));

// Admin operations
router.post('/aggregate', analyticsController.aggregateStatistics.bind(analyticsController));

module.exports = router;
