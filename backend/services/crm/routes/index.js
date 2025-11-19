const express = require('express');
const router = express.Router();
const { authenticate, authorize, enforceSchoolIsolation } = require('../../../shared/middleware/auth');
const crmController = require('../controllers/crm.controller');

/**
 * CRM Service Routes
 * Prefix: /api/v1/crm
 */

// Health check (public - no auth required)
router.get('/health', (req, res) => {
  res.json({
    service: 'CRM Service',
    status: 'Active',
    version: '1.0.0',
    features: [
      'Lead management and tracking',
      'Activity logging',
      'Pipeline management',
      'Campaign management',
      'Lead scoring',
      'CRM analytics'
    ]
  });
});

// Apply authentication and school isolation to all routes below
router.use(authenticate);
router.use(enforceSchoolIsolation('school_id'));

// =============================================
// LEAD ROUTES
// =============================================

// Create lead (Admins and Marketing)
router.post('/leads',
  authorize('admin', 'teacher'), // Teachers can add leads too
  crmController.createLead.bind(crmController)
);

// List leads (All authenticated users)
router.get('/leads',
  crmController.listLeads.bind(crmController)
);

// Get lead by ID
router.get('/leads/:id',
  crmController.getLead.bind(crmController)
);

// Update lead (Admins and assigned users)
router.put('/leads/:id',
  authorize('admin', 'teacher'),
  crmController.updateLead.bind(crmController)
);

// Delete lead (Admins only)
router.delete('/leads/:id',
  authorize('admin'),
  crmController.deleteLead.bind(crmController)
);

// Get lead activities
router.get('/leads/:id/activities',
  crmController.getLeadActivities.bind(crmController)
);

// =============================================
// ACTIVITY ROUTES
// =============================================

// Create activity (Admins and Teachers)
router.post('/activities',
  authorize('admin', 'teacher'),
  crmController.createActivity.bind(crmController)
);

// =============================================
// PIPELINE STAGE ROUTES
// =============================================

// Create pipeline stage (Admins only)
router.post('/stages',
  authorize('admin'),
  crmController.createStage.bind(crmController)
);

// Get pipeline stages
router.get('/stages',
  crmController.getStages.bind(crmController)
);

// Update pipeline stage (Admins only)
router.put('/stages/:id',
  authorize('admin'),
  crmController.updateStage.bind(crmController)
);

// Delete pipeline stage (Admins only)
router.delete('/stages/:id',
  authorize('admin'),
  crmController.deleteStage.bind(crmController)
);

// =============================================
// CAMPAIGN ROUTES
// =============================================

// Create campaign (Admins only)
router.post('/campaigns',
  authorize('admin'),
  crmController.createCampaign.bind(crmController)
);

// List campaigns
router.get('/campaigns',
  crmController.listCampaigns.bind(crmController)
);

// Get campaign by ID
router.get('/campaigns/:id',
  crmController.getCampaign.bind(crmController)
);

// Update campaign (Admins only)
router.put('/campaigns/:id',
  authorize('admin'),
  crmController.updateCampaign.bind(crmController)
);

// Delete campaign (Admins only)
router.delete('/campaigns/:id',
  authorize('admin'),
  crmController.deleteCampaign.bind(crmController)
);

// =============================================
// ANALYTICS ROUTES
// =============================================

// Get CRM dashboard metrics
router.get('/metrics',
  authorize('admin', 'teacher'),
  crmController.getDashboardMetrics.bind(crmController)
);

module.exports = router;
