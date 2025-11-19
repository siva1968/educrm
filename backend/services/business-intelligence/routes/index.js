const express = require('express');
const router = express.Router();
const { authenticate, authorize, enforceSchoolIsolation } = require('../../../shared/middleware/auth');
const dashboardController = require('../controllers/dashboard.controller');

/**
 * Business Intelligence Service Routes
 * Prefix: /api/v1/bi
 */

// Health check (public - no auth required)
router.get('/health', (req, res) => {
  res.json({
    service: 'Business Intelligence Service',
    status: 'Active',
    version: '1.0.0',
    features: [
      'Interactive dashboards',
      'Custom report generation',
      'KPI tracking and monitoring',
      'Data visualization',
      'Scheduled reports',
      'Real-time analytics'
    ]
  });
});

// Apply authentication and school isolation to all routes below
router.use(authenticate);
router.use(enforceSchoolIsolation('school_id'));

// =============================================
// DASHBOARD ROUTES
// =============================================

// Dashboard CRUD (Admins can manage, others can view)
router.post('/dashboards',
  authorize('admin'),
  dashboardController.createDashboard.bind(dashboardController)
);

router.get('/dashboards',
  dashboardController.listDashboards.bind(dashboardController)
);

router.get('/dashboards/:id',
  dashboardController.getDashboard.bind(dashboardController)
);

router.put('/dashboards/:id',
  authorize('admin'),
  dashboardController.updateDashboard.bind(dashboardController)
);

router.delete('/dashboards/:id',
  authorize('admin'),
  dashboardController.deleteDashboard.bind(dashboardController)
);

// Get dashboard data (with widget values)
router.get('/dashboards/:id/data',
  dashboardController.getDashboardData.bind(dashboardController)
);

module.exports = router;
