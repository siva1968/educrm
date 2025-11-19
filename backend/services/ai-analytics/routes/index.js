const express = require('express');
const router = express.Router();
const { authenticate, authorize, enforceSchoolIsolation } = require('../../../shared/middleware/auth');
const analyticsController = require('../controllers/analytics.controller');

/**
 * AI Analytics Service Routes
 * Prefix: /api/v1/analytics
 */

// Health check (public - no auth required)
router.get('/health', (req, res) => {
  res.json({
    service: 'AI Analytics Service',
    status: 'Active',
    version: '1.0.0',
    features: [
      'Student performance prediction',
      'Dropout risk assessment',
      'Anomaly detection',
      'Enrollment forecasting',
      'AI-powered recommendations',
      'Risk level analysis'
    ]
  });
});

// Apply authentication and school isolation to all routes below
router.use(authenticate);
router.use(enforceSchoolIsolation('school_id'));

// =============================================
// PREDICTION ROUTES
// =============================================

// Create predictions (Admins and Teachers)
router.post('/predictions/student-performance',
  authorize('admin', 'teacher'),
  analyticsController.predictStudentPerformance.bind(analyticsController)
);

router.post('/predictions/dropout-risk',
  authorize('admin', 'teacher'),
  analyticsController.predictDropoutRisk.bind(analyticsController)
);

// View predictions (All authenticated users)
router.get('/predictions',
  analyticsController.getPredictions.bind(analyticsController)
);

router.get('/predictions/:id',
  analyticsController.getPrediction.bind(analyticsController)
);

// Delete predictions (Admins only)
router.delete('/predictions/:id',
  authorize('admin'),
  analyticsController.deletePrediction.bind(analyticsController)
);

// =============================================
// ANOMALY DETECTION ROUTES
// =============================================

// Detect anomalies (Admins and Teachers)
router.post('/anomalies/detect',
  authorize('admin', 'teacher'),
  analyticsController.detectAnomalies.bind(analyticsController)
);

// View anomalies (All authenticated users)
router.get('/anomalies',
  analyticsController.getAnomalies.bind(analyticsController)
);

router.get('/anomalies/:id',
  analyticsController.getAnomaly.bind(analyticsController)
);

// Update anomalies (Admins and Teachers)
router.put('/anomalies/:id',
  authorize('admin', 'teacher'),
  analyticsController.updateAnomaly.bind(analyticsController)
);

// =============================================
// FORECASTING ROUTES
// =============================================

// Create forecasts (Admins only)
router.post('/forecasts/enrollment',
  authorize('admin'),
  analyticsController.forecastEnrollment.bind(analyticsController)
);

// View forecasts (All authenticated users)
router.get('/forecasts',
  analyticsController.getForecasts.bind(analyticsController)
);

// =============================================
// RECOMMENDATION ROUTES
// =============================================

// Generate recommendations (Admins and Teachers)
router.post('/recommendations/generate',
  authorize('admin', 'teacher'),
  analyticsController.generateRecommendations.bind(analyticsController)
);

// View recommendations (All authenticated users)
router.get('/recommendations',
  analyticsController.getRecommendations.bind(analyticsController)
);

router.get('/recommendations/:id',
  analyticsController.getRecommendation.bind(analyticsController)
);

// Update recommendations (Admins and Teachers)
router.put('/recommendations/:id',
  authorize('admin', 'teacher'),
  analyticsController.updateRecommendation.bind(analyticsController)
);

// =============================================
// UTILITY ROUTES
// =============================================

// Get student risk level
router.get('/students/:studentId/risk-level',
  analyticsController.getStudentRiskLevel.bind(analyticsController)
);

// Get analytics summary
router.get('/summary',
  authorize('admin', 'teacher'),
  analyticsController.getAnalyticsSummary.bind(analyticsController)
);

module.exports = router;
