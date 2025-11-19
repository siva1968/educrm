const communicationService = require('../services/communication.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  sendSMSSchema,
  sendBulkSMSSchema,
  sendEmailSchema,
  sendTemplatedEmailSchema,
  sendBulkEmailSchema,
  sendWhatsAppSchema,
  sendBulkWhatsAppSchema,
  sendPushNotificationSchema,
  sendMulticastPushSchema,
  sendTopicPushSchema,
  sendMultiChannelSchema,
  getSMSStatusSchema
} = require('../validators/communication.validator');

/**
 * Communication Controller
 * Handles HTTP requests for communication operations
 */
class CommunicationController {
  // =============================================
  // SMS ENDPOINTS
  // =============================================

  /**
   * Send SMS
   * POST /api/v1/communication/sms/send
   */
  async sendSMS(req, res, next) {
    try {
      const { error, value } = sendSMSSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await communicationService.sendSMS(value);

      return ApiResponse.success(res, result, 'SMS sent successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send bulk SMS
   * POST /api/v1/communication/sms/bulk
   */
  async sendBulkSMS(req, res, next) {
    try {
      const { error, value } = sendBulkSMSSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await communicationService.sendBulkSMS(value.recipients, value.message);

      return ApiResponse.success(res, result, 'Bulk SMS sent', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get SMS status
   * GET /api/v1/communication/sms/status/:messageId
   */
  async getSMSStatus(req, res, next) {
    try {
      const { messageId } = req.params;

      const result = await communicationService.getSMSStatus(messageId);

      return ApiResponse.success(res, result, 'SMS status retrieved', 200);
    } catch (error) {
      next(error);
    }
  }

  // =============================================
  // EMAIL ENDPOINTS
  // =============================================

  /**
   * Send email
   * POST /api/v1/communication/email/send
   */
  async sendEmail(req, res, next) {
    try {
      const { error, value } = sendEmailSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await communicationService.sendEmail(value);

      return ApiResponse.success(res, result, 'Email sent successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send templated email
   * POST /api/v1/communication/email/template
   */
  async sendTemplatedEmail(req, res, next) {
    try {
      const { error, value } = sendTemplatedEmailSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await communicationService.sendTemplatedEmail(value);

      return ApiResponse.success(res, result, 'Templated email sent successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send bulk email
   * POST /api/v1/communication/email/bulk
   */
  async sendBulkEmail(req, res, next) {
    try {
      const { error, value } = sendBulkEmailSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await communicationService.sendBulkEmail(value.recipients, {
        subject: value.subject,
        html: value.html,
        text: value.text
      });

      return ApiResponse.success(res, result, 'Bulk email sent', 200);
    } catch (error) {
      next(error);
    }
  }

  // =============================================
  // WHATSAPP ENDPOINTS
  // =============================================

  /**
   * Send WhatsApp message
   * POST /api/v1/communication/whatsapp/send
   */
  async sendWhatsApp(req, res, next) {
    try {
      const { error, value } = sendWhatsAppSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await communicationService.sendWhatsApp(value);

      return ApiResponse.success(res, result, 'WhatsApp message sent successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send bulk WhatsApp
   * POST /api/v1/communication/whatsapp/bulk
   */
  async sendBulkWhatsApp(req, res, next) {
    try {
      const { error, value } = sendBulkWhatsAppSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await communicationService.sendBulkWhatsApp(value.recipients, value.message);

      return ApiResponse.success(res, result, 'Bulk WhatsApp sent', 200);
    } catch (error) {
      next(error);
    }
  }

  // =============================================
  // PUSH NOTIFICATION ENDPOINTS
  // =============================================

  /**
   * Send push notification
   * POST /api/v1/communication/push/send
   */
  async sendPushNotification(req, res, next) {
    try {
      const { error, value } = sendPushNotificationSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await communicationService.sendPushNotification(value);

      return ApiResponse.success(res, result, 'Push notification sent successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send multicast push notification
   * POST /api/v1/communication/push/multicast
   */
  async sendMulticastPush(req, res, next) {
    try {
      const { error, value } = sendMulticastPushSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await communicationService.sendMulticastPushNotification(value);

      return ApiResponse.success(res, result, 'Multicast push sent', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send topic push notification
   * POST /api/v1/communication/push/topic
   */
  async sendTopicPush(req, res, next) {
    try {
      const { error, value } = sendTopicPushSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await communicationService.sendTopicPushNotification(value);

      return ApiResponse.success(res, result, 'Topic push notification sent', 200);
    } catch (error) {
      next(error);
    }
  }

  // =============================================
  // MULTI-CHANNEL ENDPOINTS
  // =============================================

  /**
   * Send multi-channel message
   * POST /api/v1/communication/multi-channel
   */
  async sendMultiChannel(req, res, next) {
    try {
      const { error, value } = sendMultiChannelSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await communicationService.sendMultiChannelMessage(value);

      return ApiResponse.success(res, result, 'Multi-channel message sent', 200);
    } catch (error) {
      next(error);
    }
  }

  // =============================================
  // SERVICE INFO ENDPOINTS
  // =============================================

  /**
   * Get service status
   * GET /api/v1/communication/status
   */
  async getServiceStatus(req, res) {
    const status = communicationService.getServiceStatus();

    return ApiResponse.success(res, status, 'Service status retrieved', 200);
  }

  /**
   * Get statistics
   * GET /api/v1/communication/statistics
   */
  async getStatistics(req, res, next) {
    try {
      const stats = await communicationService.getStatistics();

      return ApiResponse.success(res, stats, 'Statistics retrieved', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get capabilities
   * GET /api/v1/communication/capabilities
   */
  async getCapabilities(req, res) {
    const capabilities = {
      sms: {
        available: true,
        provider: 'Twilio',
        features: ['single message', 'bulk messaging', 'delivery tracking', 'scheduled messages'],
        maxBulkSize: 100,
        characterLimit: 1600
      },
      email: {
        available: true,
        provider: 'SendGrid',
        features: ['single email', 'bulk email', 'templates', 'attachments', 'tracking'],
        maxBulkSize: 1000,
        maxAttachmentSize: '10MB'
      },
      whatsapp: {
        available: true,
        provider: 'WhatsApp Business API',
        features: ['text messages', 'template messages', 'bulk messaging', 'media messages'],
        maxBulkSize: 100,
        characterLimit: 4096
      },
      push: {
        available: true,
        provider: 'Firebase Cloud Messaging',
        features: ['single device', 'multicast', 'topic messaging', 'rich notifications', 'data payload'],
        maxMulticastSize: 500
      },
      multiChannel: {
        available: true,
        description: 'Send messages across multiple channels simultaneously',
        supportedChannels: ['sms', 'email', 'whatsapp', 'push']
      }
    };

    return ApiResponse.success(res, capabilities);
  }
}

module.exports = new CommunicationController();
