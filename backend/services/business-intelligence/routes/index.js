const express = require('express');
const router = express.Router();
const { authenticate, authorize, enforceSchoolIsolation } = require('../../../shared/middleware/auth');
const dashboardController = require('../controllers/dashboard.controller');
const reportController = require('../controllers/report.controller');

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

// =============================================
// REPORT ROUTES
// =============================================

// Report CRUD (Admins and Teachers can manage)
router.post('/reports',
  authorize('admin', 'teacher'),
  reportController.createReport.bind(reportController)
);

router.get('/reports',
  reportController.listReports.bind(reportController)
);

router.get('/reports/:id',
  reportController.getReport.bind(reportController)
);

router.put('/reports/:id',
  authorize('admin', 'teacher'),
  reportController.updateReport.bind(reportController)
);

router.delete('/reports/:id',
  authorize('admin'),
  reportController.deleteReport.bind(reportController)
);

// Generate report
router.post('/reports/:id/generate',
  authorize('admin', 'teacher'),
  reportController.generateReport.bind(reportController)
);

// Report executions
router.get('/reports/executions',
  reportController.getReportExecutions.bind(reportController)
);

router.get('/reports/executions/:id/download',
  reportController.downloadReport.bind(reportController)
);

module.exports = router;
