const express = require('express');
const router = express.Router();
const communicationController = require('../controllers/communication.controller');
const auth = require('../../../shared/middleware/auth');
const authorize = require('../../../shared/middleware/authorize');

/**
 * Communication Service Routes
 * All routes require authentication
 * Most routes require teacher/admin roles
 */

// =============================================
// SMS ROUTES
// =============================================

/**
 * @swagger
 * /api/v1/communication/sms/send:
 *   post:
 *     summary: Send SMS message
 *     tags: [Communication - SMS]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - message
 *             properties:
 *               to:
 *                 type: string
 *                 description: Phone number in E.164 format
 *               message:
 *                 type: string
 *                 maxLength: 1600
 *     responses:
 *       200:
 *         description: SMS sent successfully
 */
router.post('/sms/send', auth, authorize(['teacher', 'admin']), communicationController.sendSMS);

/**
 * @swagger
 * /api/v1/communication/sms/bulk:
 *   post:
 *     summary: Send bulk SMS messages
 *     tags: [Communication - SMS]
 *     security:
 *       - BearerAuth: []
 */
router.post('/sms/bulk', auth, authorize(['admin']), communicationController.sendBulkSMS);

/**
 * @swagger
 * /api/v1/communication/sms/status/{messageId}:
 *   get:
 *     summary: Get SMS delivery status
 *     tags: [Communication - SMS]
 *     security:
 *       - BearerAuth: []
 */
router.get('/sms/status/:messageId', auth, communicationController.getSMSStatus);

// =============================================
// EMAIL ROUTES
// =============================================

/**
 * @swagger
 * /api/v1/communication/email/send:
 *   post:
 *     summary: Send email
 *     tags: [Communication - Email]
 *     security:
 *       - BearerAuth: []
 */
router.post('/email/send', auth, authorize(['teacher', 'admin']), communicationController.sendEmail);

/**
 * @swagger
 * /api/v1/communication/email/template:
 *   post:
 *     summary: Send templated email
 *     tags: [Communication - Email]
 *     security:
 *       - BearerAuth: []
 */
router.post('/email/template', auth, authorize(['teacher', 'admin']), communicationController.sendTemplatedEmail);

/**
 * @swagger
 * /api/v1/communication/email/bulk:
 *   post:
 *     summary: Send bulk emails
 *     tags: [Communication - Email]
 *     security:
 *       - BearerAuth: []
 */
router.post('/email/bulk', auth, authorize(['admin']), communicationController.sendBulkEmail);

// =============================================
// WHATSAPP ROUTES
// =============================================

/**
 * @swagger
 * /api/v1/communication/whatsapp/send:
 *   post:
 *     summary: Send WhatsApp message
 *     tags: [Communication - WhatsApp]
 *     security:
 *       - BearerAuth: []
 */
router.post('/whatsapp/send', auth, authorize(['teacher', 'admin']), communicationController.sendWhatsApp);

/**
 * @swagger
 * /api/v1/communication/whatsapp/bulk:
 *   post:
 *     summary: Send bulk WhatsApp messages
 *     tags: [Communication - WhatsApp]
 *     security:
 *       - BearerAuth: []
 */
router.post('/whatsapp/bulk', auth, authorize(['admin']), communicationController.sendBulkWhatsApp);

// =============================================
// PUSH NOTIFICATION ROUTES
// =============================================

/**
 * @swagger
 * /api/v1/communication/push/send:
 *   post:
 *     summary: Send push notification
 *     tags: [Communication - Push]
 *     security:
 *       - BearerAuth: []
 */
router.post('/push/send', auth, authorize(['teacher', 'admin']), communicationController.sendPushNotification);

/**
 * @swagger
 * /api/v1/communication/push/multicast:
 *   post:
 *     summary: Send multicast push notification
 *     tags: [Communication - Push]
 *     security:
 *       - BearerAuth: []
 */
router.post('/push/multicast', auth, authorize(['admin']), communicationController.sendMulticastPush);

/**
 * @swagger
 * /api/v1/communication/push/topic:
 *   post:
 *     summary: Send topic push notification
 *     tags: [Communication - Push]
 *     security:
 *       - BearerAuth: []
 */
router.post('/push/topic', auth, authorize(['admin']), communicationController.sendTopicPush);

// =============================================
// MULTI-CHANNEL ROUTES
// =============================================

/**
 * @swagger
 * /api/v1/communication/multi-channel:
 *   post:
 *     summary: Send message across multiple channels
 *     tags: [Communication - Multi-Channel]
 *     security:
 *       - BearerAuth: []
 */
router.post('/multi-channel', auth, authorize(['admin']), communicationController.sendMultiChannel);

// =============================================
// SERVICE INFO ROUTES
// =============================================

/**
 * @swagger
 * /api/v1/communication/status:
 *   get:
 *     summary: Get service provider status
 *     tags: [Communication - Service Info]
 *     security:
 *       - BearerAuth: []
 */
router.get('/status', auth, authorize(['admin']), communicationController.getServiceStatus);

/**
 * @swagger
 * /api/v1/communication/statistics:
 *   get:
 *     summary: Get communication statistics
 *     tags: [Communication - Service Info]
 *     security:
 *       - BearerAuth: []
 */
router.get('/statistics', auth, authorize(['admin']), communicationController.getStatistics);

/**
 * @swagger
 * /api/v1/communication/capabilities:
 *   get:
 *     summary: Get service capabilities
 *     tags: [Communication - Service Info]
 */
router.get('/capabilities', communicationController.getCapabilities);

/**
 * @swagger
 * /api/v1/communication/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Communication - Service Info]
 */
router.get('/health', (req, res) => {
  res.json({
    service: 'Communication Integration Service',
    status: 'Active',
    version: '1.0.0',
    features: [
      'SMS via Twilio',
      'Email via SendGrid',
      'WhatsApp Business API',
      'Push notifications via FCM',
      'Multi-channel messaging',
      'Bulk messaging',
      'Template support',
      'Delivery tracking'
    ],
    providers: {
      sms: 'Twilio',
      email: 'SendGrid',
      whatsapp: 'WhatsApp Business API',
      push: 'Firebase Cloud Messaging'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
