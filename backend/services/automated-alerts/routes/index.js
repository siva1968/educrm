const express = require('express');
const router = express.Router();
const { authenticate, authorize, enforceSchoolIsolation } = require('../../../shared/middleware/auth');
const alertController = require('../controllers/alert.controller');

/**
 * Automated Alerts Service Routes
 * Prefix: /api/v1/alerts
 */

// Health check (public - no auth required)
router.get('/health', (req, res) => {
  res.json({
    service: 'Automated Alerts Service',
    status: 'Active',
    version: '1.0.0',
    features: [
      'Configurable alert rules',
      'Real-time alert triggering',
      'Multi-channel notifications',
      'User subscriptions',
      'Alert acknowledgment and resolution',
      'Rule evaluation engine'
    ]
  });
});

// Apply authentication and school isolation to all routes below
router.use(authenticate);
router.use(enforceSchoolIsolation('school_id'));

// =============================================
// ALERT RULE ROUTES
// =============================================

// Create alert rule (Admins only)
router.post('/rules',
  authorize('admin'),
  alertController.createAlertRule.bind(alertController)
);

// List alert rules (All authenticated users)
router.get('/rules',
  alertController.listAlertRules.bind(alertController)
);

// Get alert rule by ID
router.get('/rules/:id',
  alertController.getAlertRule.bind(alertController)
);

// Update alert rule (Admins only)
router.put('/rules/:id',
  authorize('admin'),
  alertController.updateAlertRule.bind(alertController)
);

// Delete alert rule (Admins only)
router.delete('/rules/:id',
  authorize('admin'),
  alertController.deleteAlertRule.bind(alertController)
);

// =============================================
// ALERT INSTANCE ROUTES
// =============================================

// Trigger alert (Admins and Teachers)
router.post('/instances/trigger',
  authorize('admin', 'teacher'),
  alertController.triggerAlert.bind(alertController)
);

// List alert instances (All authenticated users)
router.get('/instances',
  alertController.listAlertInstances.bind(alertController)
);

// Get alert instance by ID
router.get('/instances/:id',
  alertController.getAlertInstance.bind(alertController)
);

// Update alert instance (Admins and Teachers)
router.put('/instances/:id',
  authorize('admin', 'teacher'),
  alertController.updateAlertInstance.bind(alertController)
);

// =============================================
// USER SUBSCRIPTION ROUTES
// =============================================

// Create subscription (All authenticated users)
router.post('/subscriptions',
  alertController.createSubscription.bind(alertController)
);

// Get user subscriptions
router.get('/subscriptions',
  alertController.getUserSubscriptions.bind(alertController)
);

// Update subscription
router.put('/subscriptions/:id',
  alertController.updateSubscription.bind(alertController)
);

// Delete subscription
router.delete('/subscriptions/:id',
  alertController.deleteSubscription.bind(alertController)
);

// =============================================
// RULE EVALUATION ROUTES
// =============================================

// Evaluate alert rules (Admins only - typically called by background job)
router.post('/evaluate',
  authorize('admin'),
  alertController.evaluateRules.bind(alertController)
);

module.exports = router;
