const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const axios = require('axios');
const admin = require('firebase-admin');
const Handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Communication Service
 * Unified interface for SMS, Email, WhatsApp, and Push Notifications
 */
class CommunicationService {
  constructor() {
    this.twilioClient = null;
    this.sendGridInitialized = false;
    this.firebaseInitialized = false;
    this.whatsappInitialized = false;
    this.templateCache = new Map();

    this.initialize();
  }

  /**
   * Initialize all communication providers
   */
  async initialize() {
    try {
      // Initialize Twilio
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        console.log('✓ Twilio initialized');
      } else {
        console.warn('⚠ Twilio credentials not configured');
      }

      // Initialize SendGrid
      if (process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.sendGridInitialized = true;
        console.log('✓ SendGrid initialized');
      } else {
        console.warn('⚠ SendGrid API key not configured');
      }

      // Initialize Firebase Admin (for FCM)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        this.firebaseInitialized = true;
        console.log('✓ Firebase Cloud Messaging initialized');
      } else {
        console.warn('⚠ Firebase credentials not configured');
      }

      // WhatsApp Business API configuration
      if (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
        this.whatsappInitialized = true;
        console.log('✓ WhatsApp Business API configured');
      } else {
        console.warn('⚠ WhatsApp Business API not configured');
      }

    } catch (error) {
      console.error('Communication service initialization error:', error.message);
    }
  }

  // =============================================
  // SMS SERVICES (TWILIO)
  // =============================================

  /**
   * Send SMS via Twilio
   * @param {Object} smsData - SMS parameters
   */
  async sendSMS(smsData) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio is not initialized. Please configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
      }

      const { to, message, from } = smsData;
      const fromNumber = from || process.env.TWILIO_PHONE_NUMBER;

      if (!fromNumber) {
        throw new Error('Twilio phone number not configured');
      }

      const result = await this.twilioClient.messages.create({
        body: message,
        from: fromNumber,
        to: to
      });

      return {
        messageId: result.sid,
        status: result.status,
        to: result.to,
        from: result.from,
        provider: 'twilio',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`SMS sending failed: ${error.message}`);
    }
  }

  /**
   * Send bulk SMS
   * @param {Array} recipients - Array of phone numbers
   * @param {String} message - Message content
   */
  async sendBulkSMS(recipients, message) {
    const results = {
      total: recipients.length,
      successful: 0,
      failed: 0,
      details: []
    };

    for (const phoneNumber of recipients) {
      try {
        const result = await this.sendSMS({
          to: phoneNumber,
          message
        });
        results.successful++;
        results.details.push({
          phoneNumber,
          status: 'sent',
          messageId: result.messageId
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          phoneNumber,
          status: 'failed',
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get SMS delivery status
   */
  async getSMSStatus(messageId) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio is not initialized');
      }

      const message = await this.twilioClient.messages(messageId).fetch();

      return {
        messageId: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error) {
      throw new Error(`Failed to get SMS status: ${error.message}`);
    }
  }

  // =============================================
  // EMAIL SERVICES (SENDGRID)
  // =============================================

  /**
   * Send email via SendGrid
   * @param {Object} emailData - Email parameters
   */
  async sendEmail(emailData) {
    try {
      if (!this.sendGridInitialized) {
        throw new Error('SendGrid is not initialized. Please configure SENDGRID_API_KEY.');
      }

      const {
        to,
        subject,
        text,
        html,
        from,
        cc,
        bcc,
        attachments,
        templateId,
        templateData
      } = emailData;

      const fromEmail = from || process.env.SENDGRID_FROM_EMAIL || 'noreply@educrm.com';
      const fromName = process.env.SENDGRID_FROM_NAME || 'EduCRM';

      const msg = {
        to: Array.isArray(to) ? to : [to],
        from: {
          email: fromEmail,
          name: fromName
        },
        subject,
        text,
        html
      };

      // Add CC if provided
      if (cc) {
        msg.cc = Array.isArray(cc) ? cc : [cc];
      }

      // Add BCC if provided
      if (bcc) {
        msg.bcc = Array.isArray(bcc) ? bcc : [bcc];
      }

      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        msg.attachments = attachments.map(att => ({
          content: att.content,
          filename: att.filename,
          type: att.type,
          disposition: att.disposition || 'attachment'
        }));
      }

      // Use SendGrid template if provided
      if (templateId) {
        msg.templateId = templateId;
        msg.dynamicTemplateData = templateData || {};
      }

      const result = await sgMail.send(msg);

      return {
        messageId: result[0].headers['x-message-id'],
        status: 'sent',
        to: msg.to,
        subject,
        provider: 'sendgrid',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Send email using local template
   * @param {Object} emailData - Email parameters with template
   */
  async sendTemplatedEmail(emailData) {
    try {
      const { to, subject, templateName, templateData } = emailData;

      // Load and compile template
      const htmlContent = await this.renderTemplate(templateName, templateData);

      return await this.sendEmail({
        to,
        subject,
        html: htmlContent,
        text: this.htmlToText(htmlContent)
      });
    } catch (error) {
      throw new Error(`Templated email sending failed: ${error.message}`);
    }
  }

  /**
   * Render email template with Handlebars
   */
  async renderTemplate(templateName, data) {
    try {
      // Check cache first
      if (this.templateCache.has(templateName)) {
        const template = this.templateCache.get(templateName);
        return template(data);
      }

      // Load template from file
      const templatePath = path.join(__dirname, '../templates', `${templateName}.hbs`);
      const templateSource = await fs.readFile(templatePath, 'utf8');

      // Compile template
      const template = Handlebars.compile(templateSource);

      // Cache compiled template
      this.templateCache.set(templateName, template);

      return template(data);
    } catch (error) {
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Convert HTML to plain text (simplified)
   */
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmail(recipients, emailTemplate) {
    const results = {
      total: recipients.length,
      successful: 0,
      failed: 0,
      details: []
    };

    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail({
          to: recipient.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text
        });
        results.successful++;
        results.details.push({
          email: recipient.email,
          status: 'sent',
          messageId: result.messageId
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          email: recipient.email,
          status: 'failed',
          error: error.message
        });
      }
    }

    return results;
  }

  // =============================================
  // WHATSAPP SERVICES
  // =============================================

  /**
   * Send WhatsApp message
   * @param {Object} whatsappData - WhatsApp parameters
   */
  async sendWhatsApp(whatsappData) {
    try {
      if (!this.whatsappInitialized) {
        throw new Error('WhatsApp Business API is not configured');
      }

      const { to, message, templateName, templateParams } = whatsappData;

      const apiUrl = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

      let payload;

      if (templateName) {
        // Send template message
        payload = {
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: 'en'
            },
            components: templateParams || []
          }
        };
      } else {
        // Send text message
        payload = {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: message
          }
        };
      }

      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        messageId: response.data.messages[0].id,
        status: 'sent',
        to: to,
        provider: 'whatsapp',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`WhatsApp message sending failed: ${error.message}`);
    }
  }

  /**
   * Send bulk WhatsApp messages
   */
  async sendBulkWhatsApp(recipients, message) {
    const results = {
      total: recipients.length,
      successful: 0,
      failed: 0,
      details: []
    };

    for (const phoneNumber of recipients) {
      try {
        const result = await this.sendWhatsApp({
          to: phoneNumber,
          message
        });
        results.successful++;
        results.details.push({
          phoneNumber,
          status: 'sent',
          messageId: result.messageId
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          phoneNumber,
          status: 'failed',
          error: error.message
        });
      }
    }

    return results;
  }

  // =============================================
  // PUSH NOTIFICATIONS (FIREBASE CLOUD MESSAGING)
  // =============================================

  /**
   * Send push notification via FCM
   * @param {Object} notificationData - Notification parameters
   */
  async sendPushNotification(notificationData) {
    try {
      if (!this.firebaseInitialized) {
        throw new Error('Firebase Cloud Messaging is not initialized');
      }

      const { token, title, body, data, imageUrl } = notificationData;

      const message = {
        notification: {
          title,
          body
        },
        token
      };

      // Add image if provided
      if (imageUrl) {
        message.notification.imageUrl = imageUrl;
      }

      // Add custom data if provided
      if (data) {
        message.data = data;
      }

      const response = await admin.messaging().send(message);

      return {
        messageId: response,
        status: 'sent',
        token,
        provider: 'fcm',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Push notification failed: ${error.message}`);
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendMulticastPushNotification(notificationData) {
    try {
      if (!this.firebaseInitialized) {
        throw new Error('Firebase Cloud Messaging is not initialized');
      }

      const { tokens, title, body, data, imageUrl } = notificationData;

      const message = {
        notification: {
          title,
          body
        },
        tokens
      };

      if (imageUrl) {
        message.notification.imageUrl = imageUrl;
      }

      if (data) {
        message.data = data;
      }

      const response = await admin.messaging().sendMulticast(message);

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses.map((resp, idx) => ({
          token: tokens[idx],
          success: resp.success,
          messageId: resp.messageId,
          error: resp.error ? resp.error.message : null
        })),
        provider: 'fcm',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Multicast push notification failed: ${error.message}`);
    }
  }

  /**
   * Send push notification to topic
   */
  async sendTopicPushNotification(notificationData) {
    try {
      if (!this.firebaseInitialized) {
        throw new Error('Firebase Cloud Messaging is not initialized');
      }

      const { topic, title, body, data, imageUrl } = notificationData;

      const message = {
        notification: {
          title,
          body
        },
        topic
      };

      if (imageUrl) {
        message.notification.imageUrl = imageUrl;
      }

      if (data) {
        message.data = data;
      }

      const response = await admin.messaging().send(message);

      return {
        messageId: response,
        status: 'sent',
        topic,
        provider: 'fcm',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Topic push notification failed: ${error.message}`);
    }
  }

  // =============================================
  // UNIFIED MESSAGING
  // =============================================

  /**
   * Send message via multiple channels
   * @param {Object} messageData - Unified message data
   */
  async sendMultiChannelMessage(messageData) {
    const {
      channels,
      recipients,
      message,
      subject,
      template
    } = messageData;

    const results = {
      channels: {},
      summary: {
        total: 0,
        successful: 0,
        failed: 0
      }
    };

    // Send via SMS
    if (channels.includes('sms') && recipients.sms) {
      try {
        const smsResult = await this.sendBulkSMS(recipients.sms, message);
        results.channels.sms = smsResult;
        results.summary.total += smsResult.total;
        results.summary.successful += smsResult.successful;
        results.summary.failed += smsResult.failed;
      } catch (error) {
        results.channels.sms = { error: error.message };
      }
    }

    // Send via Email
    if (channels.includes('email') && recipients.email) {
      try {
        const emailResult = await this.sendBulkEmail(
          recipients.email.map(e => ({ email: e })),
          { subject, html: message, text: message }
        );
        results.channels.email = emailResult;
        results.summary.total += emailResult.total;
        results.summary.successful += emailResult.successful;
        results.summary.failed += emailResult.failed;
      } catch (error) {
        results.channels.email = { error: error.message };
      }
    }

    // Send via WhatsApp
    if (channels.includes('whatsapp') && recipients.whatsapp) {
      try {
        const whatsappResult = await this.sendBulkWhatsApp(recipients.whatsapp, message);
        results.channels.whatsapp = whatsappResult;
        results.summary.total += whatsappResult.total;
        results.summary.successful += whatsappResult.successful;
        results.summary.failed += whatsappResult.failed;
      } catch (error) {
        results.channels.whatsapp = { error: error.message };
      }
    }

    // Send via Push Notification
    if (channels.includes('push') && recipients.push) {
      try {
        const pushResult = await this.sendMulticastPushNotification({
          tokens: recipients.push,
          title: subject,
          body: message
        });
        results.channels.push = pushResult;
        results.summary.total += recipients.push.length;
        results.summary.successful += pushResult.successCount;
        results.summary.failed += pushResult.failureCount;
      } catch (error) {
        results.channels.push = { error: error.message };
      }
    }

    return results;
  }

  // =============================================
  // ANALYTICS & REPORTING
  // =============================================

  /**
   * Get communication statistics
   */
  async getStatistics() {
    // TODO: Implement database queries for statistics
    return {
      sms: {
        sent: 0,
        delivered: 0,
        failed: 0
      },
      email: {
        sent: 0,
        opened: 0,
        clicked: 0,
        bounced: 0
      },
      whatsapp: {
        sent: 0,
        delivered: 0,
        read: 0
      },
      push: {
        sent: 0,
        delivered: 0,
        clicked: 0
      }
    };
  }

  /**
   * Get service status
   */
  getServiceStatus() {
    return {
      twilio: {
        initialized: this.twilioClient !== null,
        configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
      },
      sendgrid: {
        initialized: this.sendGridInitialized,
        configured: !!process.env.SENDGRID_API_KEY
      },
      whatsapp: {
        initialized: this.whatsappInitialized,
        configured: !!(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
      },
      firebase: {
        initialized: this.firebaseInitialized,
        configured: !!process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      }
    };
  }
}

module.exports = new CommunicationService();
