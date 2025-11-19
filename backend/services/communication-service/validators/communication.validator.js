const Joi = require('joi');

/**
 * Communication Service Request Validators
 */

/**
 * SMS Schema
 */
const sendSMSSchema = Joi.object({
  to: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .description('Recipient phone number in E.164 format'),

  message: Joi.string()
    .min(1)
    .max(1600)
    .required()
    .description('SMS message content'),

  from: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .description('Sender phone number'),

  scheduleTime: Joi.date()
    .optional()
    .description('Schedule message for future delivery')
});

/**
 * Bulk SMS Schema
 */
const sendBulkSMSSchema = Joi.object({
  recipients: Joi.array()
    .items(Joi.string().pattern(/^\+?[1-9]\d{1,14}$/))
    .min(1)
    .max(100)
    .required()
    .description('Array of phone numbers'),

  message: Joi.string()
    .min(1)
    .max(1600)
    .required()
    .description('SMS message content')
});

/**
 * Email Schema
 */
const sendEmailSchema = Joi.object({
  to: Joi.alternatives()
    .try(
      Joi.string().email(),
      Joi.array().items(Joi.string().email())
    )
    .required()
    .description('Recipient email address(es)'),

  subject: Joi.string()
    .min(1)
    .max(255)
    .required()
    .description('Email subject'),

  text: Joi.string()
    .optional()
    .description('Plain text email content'),

  html: Joi.string()
    .optional()
    .description('HTML email content'),

  from: Joi.string()
    .email()
    .optional()
    .description('Sender email address'),

  cc: Joi.alternatives()
    .try(
      Joi.string().email(),
      Joi.array().items(Joi.string().email())
    )
    .optional()
    .description('CC recipients'),

  bcc: Joi.alternatives()
    .try(
      Joi.string().email(),
      Joi.array().items(Joi.string().email())
    )
    .optional()
    .description('BCC recipients'),

  attachments: Joi.array()
    .items(
      Joi.object({
        content: Joi.string().required(),
        filename: Joi.string().required(),
        type: Joi.string().optional(),
        disposition: Joi.string().valid('attachment', 'inline').optional()
      })
    )
    .optional(),

  templateId: Joi.string()
    .optional()
    .description('SendGrid template ID'),

  templateData: Joi.object()
    .optional()
    .description('Template variables'),

  scheduleTime: Joi.date()
    .optional()
    .description('Schedule email for future delivery')
}).or('text', 'html', 'templateId');

/**
 * Templated Email Schema
 */
const sendTemplatedEmailSchema = Joi.object({
  to: Joi.alternatives()
    .try(
      Joi.string().email(),
      Joi.array().items(Joi.string().email())
    )
    .required(),

  subject: Joi.string()
    .min(1)
    .max(255)
    .required(),

  templateName: Joi.string()
    .required()
    .description('Local template name (without .hbs extension)'),

  templateData: Joi.object()
    .required()
    .description('Data to populate template')
});

/**
 * Bulk Email Schema
 */
const sendBulkEmailSchema = Joi.object({
  recipients: Joi.array()
    .items(
      Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().optional()
      })
    )
    .min(1)
    .max(1000)
    .required(),

  subject: Joi.string()
    .min(1)
    .max(255)
    .required(),

  html: Joi.string().required(),

  text: Joi.string().optional()
});

/**
 * WhatsApp Schema
 */
const sendWhatsAppSchema = Joi.object({
  to: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .description('Recipient phone number'),

  message: Joi.string()
    .when('templateName', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required()
    })
    .max(4096)
    .description('Message content'),

  templateName: Joi.string()
    .optional()
    .description('WhatsApp approved template name'),

  templateParams: Joi.array()
    .optional()
    .description('Template parameters')
});

/**
 * Bulk WhatsApp Schema
 */
const sendBulkWhatsAppSchema = Joi.object({
  recipients: Joi.array()
    .items(Joi.string().pattern(/^\+?[1-9]\d{1,14}$/))
    .min(1)
    .max(100)
    .required(),

  message: Joi.string()
    .max(4096)
    .required()
});

/**
 * Push Notification Schema
 */
const sendPushNotificationSchema = Joi.object({
  token: Joi.string()
    .required()
    .description('FCM device token'),

  title: Joi.string()
    .min(1)
    .max(100)
    .required()
    .description('Notification title'),

  body: Joi.string()
    .min(1)
    .max(500)
    .required()
    .description('Notification body'),

  data: Joi.object()
    .optional()
    .description('Custom data payload'),

  imageUrl: Joi.string()
    .uri()
    .optional()
    .description('Notification image URL')
});

/**
 * Multicast Push Notification Schema
 */
const sendMulticastPushSchema = Joi.object({
  tokens: Joi.array()
    .items(Joi.string())
    .min(1)
    .max(500)
    .required()
    .description('Array of FCM device tokens'),

  title: Joi.string()
    .min(1)
    .max(100)
    .required(),

  body: Joi.string()
    .min(1)
    .max(500)
    .required(),

  data: Joi.object()
    .optional(),

  imageUrl: Joi.string()
    .uri()
    .optional()
});

/**
 * Topic Push Notification Schema
 */
const sendTopicPushSchema = Joi.object({
  topic: Joi.string()
    .required()
    .description('FCM topic name'),

  title: Joi.string()
    .min(1)
    .max(100)
    .required(),

  body: Joi.string()
    .min(1)
    .max(500)
    .required(),

  data: Joi.object()
    .optional(),

  imageUrl: Joi.string()
    .uri()
    .optional()
});

/**
 * Multi-Channel Message Schema
 */
const sendMultiChannelSchema = Joi.object({
  channels: Joi.array()
    .items(Joi.string().valid('sms', 'email', 'whatsapp', 'push'))
    .min(1)
    .required()
    .description('Communication channels to use'),

  recipients: Joi.object({
    sms: Joi.array()
      .items(Joi.string().pattern(/^\+?[1-9]\d{1,14}$/))
      .when(Joi.ref('...channels'), {
        is: Joi.array().items(Joi.string().valid('sms')),
        then: Joi.required(),
        otherwise: Joi.optional()
      }),

    email: Joi.array()
      .items(Joi.string().email())
      .when(Joi.ref('...channels'), {
        is: Joi.array().items(Joi.string().valid('email')),
        then: Joi.required(),
        otherwise: Joi.optional()
      }),

    whatsapp: Joi.array()
      .items(Joi.string().pattern(/^\+?[1-9]\d{1,14}$/))
      .optional(),

    push: Joi.array()
      .items(Joi.string())
      .optional()
  }).required(),

  message: Joi.string()
    .min(1)
    .required()
    .description('Message content'),

  subject: Joi.string()
    .when('channels', {
      is: Joi.array().items(Joi.string().valid('email')),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .description('Subject (for email and push)'),

  template: Joi.string()
    .optional()
    .description('Template name')
});

/**
 * SMS Status Query Schema
 */
const getSMSStatusSchema = Joi.object({
  messageId: Joi.string()
    .required()
    .description('Twilio message SID')
});

module.exports = {
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
};
