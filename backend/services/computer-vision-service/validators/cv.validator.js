const Joi = require('joi');

/**
 * Computer Vision Request Validators
 */

/**
 * OCR Text Extraction Schema
 */
const extractTextSchema = Joi.object({
  language: Joi.string()
    .valid('eng', 'hin', 'spa', 'fra', 'deu', 'chi_sim', 'jpn', 'kor')
    .default('eng')
    .description('OCR language'),

  preprocessImage: Joi.boolean()
    .default(true)
    .description('Apply image preprocessing for better OCR'),

  confidence: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .default(60)
    .description('Minimum confidence threshold'),

  studentId: Joi.string().uuid().optional(),
  documentId: Joi.string().uuid().optional()
});

/**
 * Handwriting Extraction Schema
 */
const extractHandwritingSchema = Joi.object({
  language: Joi.string()
    .valid('eng', 'hin')
    .default('eng'),

  confidence: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .default(40)
    .description('Lower threshold for handwriting'),

  studentId: Joi.string().uuid().optional(),
  assignmentId: Joi.string().uuid().optional()
});

/**
 * Answer Sheet Evaluation Schema
 */
const evaluateAnswerSheetSchema = Joi.object({
  answerKey: Joi.object({
    answers: Joi.array()
      .items(Joi.string().valid('A', 'B', 'C', 'D', 'E'))
      .min(1)
      .max(200)
      .required()
      .description('Correct answers array'),

    totalMarks: Joi.number()
      .integer()
      .min(1)
      .default(100)
      .description('Total marks for the test'),

    negativeMarking: Joi.boolean()
      .default(false)
      .description('Enable negative marking'),

    negativeMarkingRatio: Joi.number()
      .min(0)
      .max(1)
      .default(0.25)
      .description('Marks to deduct for wrong answer')
  }).required(),

  sheetType: Joi.string()
    .valid('type-a', 'type-b', 'custom')
    .default('type-a')
    .description('Answer sheet template type'),

  studentId: Joi.string().uuid().optional(),
  examId: Joi.string().uuid().optional(),

  metadata: Joi.object({
    examName: Joi.string(),
    subject: Joi.string(),
    date: Joi.date()
  }).optional()
});

/**
 * ID Card Verification Schema
 */
const verifyIDCardSchema = Joi.object({
  checkFace: Joi.boolean()
    .default(true)
    .description('Verify face presence'),

  extractInfo: Joi.boolean()
    .default(true)
    .description('Extract ID card information'),

  strictValidation: Joi.boolean()
    .default(false)
    .description('Require all fields to be present'),

  studentId: Joi.string().uuid().optional(),

  expectedInfo: Joi.object({
    studentId: Joi.string(),
    name: Joi.string()
  }).optional().description('Expected values for validation')
});

/**
 * Face Detection Schema
 */
const detectFacesSchema = Joi.object({
  minConfidence: Joi.number()
    .min(0)
    .max(1)
    .default(0.5)
    .description('Minimum face detection confidence'),

  maxFaces: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .description('Maximum number of faces to detect'),

  detectLandmarks: Joi.boolean()
    .default(true)
    .description('Detect facial landmarks'),

  detectDescriptors: Joi.boolean()
    .default(true)
    .description('Generate face descriptors for recognition')
});

/**
 * Face Comparison Schema
 */
const compareFacesSchema = Joi.object({
  image1: Joi.string()
    .required()
    .description('First image ID or path'),

  image2: Joi.string()
    .required()
    .description('Second image ID or path'),

  threshold: Joi.number()
    .min(0)
    .max(1)
    .default(0.6)
    .description('Match threshold')
});

/**
 * Attendance Marking Schema
 */
const markAttendanceSchema = Joi.object({
  classId: Joi.string()
    .uuid()
    .required()
    .description('Class identifier'),

  sessionId: Joi.string()
    .uuid()
    .required()
    .description('Session identifier'),

  timestamp: Joi.date()
    .default(() => new Date())
    .description('Attendance timestamp'),

  location: Joi.object({
    latitude: Joi.number(),
    longitude: Joi.number(),
    accuracy: Joi.number()
  }).optional(),

  allowMultipleFaces: Joi.boolean()
    .default(false)
    .description('Allow group attendance marking')
});

/**
 * Document Processing Schema
 */
const processDocumentSchema = Joi.object({
  documentType: Joi.string()
    .valid('report-card', 'certificate', 'transcript', 'assignment', 'general')
    .default('general')
    .description('Type of document'),

  deskew: Joi.boolean()
    .default(true)
    .description('Correct document skew/rotation'),

  removeNoise: Joi.boolean()
    .default(true)
    .description('Remove image noise'),

  enhanceContrast: Joi.boolean()
    .default(true)
    .description('Enhance image contrast'),

  extractText: Joi.boolean()
    .default(true)
    .description('Extract text via OCR'),

  extractInfo: Joi.boolean()
    .default(true)
    .description('Extract structured information'),

  outputFormat: Joi.string()
    .valid('png', 'jpeg', 'webp', 'tiff')
    .default('png')
    .description('Output image format'),

  studentId: Joi.string().uuid().optional(),
  documentId: Joi.string().uuid().optional()
});

/**
 * Document Boundary Detection Schema
 */
const detectBoundariesSchema = Joi.object({
  autocrop: Joi.boolean()
    .default(false)
    .description('Automatically crop to detected boundaries'),

  correctPerspective: Joi.boolean()
    .default(false)
    .description('Apply perspective correction')
});

/**
 * Image Resize Schema
 */
const resizeImageSchema = Joi.object({
  width: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .description('Target width'),

  height: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .description('Target height'),

  fit: Joi.string()
    .valid('cover', 'contain', 'fill', 'inside', 'outside')
    .default('inside')
    .description('Resize fit mode'),

  format: Joi.string()
    .valid('jpeg', 'png', 'webp', 'tiff')
    .default('jpeg')
    .description('Output format'),

  quality: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(80)
    .description('Output quality (for lossy formats)')
}).or('width', 'height');

/**
 * File Upload Validation
 */
const fileUploadSchema = Joi.object({
  mimetype: Joi.string()
    .valid('image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff', 'application/pdf')
    .required()
    .messages({
      'any.only': 'Only JPEG, PNG, WebP, TIFF, and PDF files are allowed'
    }),

  size: Joi.number()
    .max(10 * 1024 * 1024) // 10MB
    .required()
    .messages({
      'number.max': 'File size must be less than 10MB'
    })
});

/**
 * Batch Processing Schema
 */
const batchProcessSchema = Joi.object({
  operation: Joi.string()
    .valid('ocr', 'face-detection', 'document-processing')
    .required(),

  imageCount: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .required()
    .description('Number of images to process'),

  options: Joi.object().optional(),

  batchId: Joi.string().uuid().optional()
});

module.exports = {
  extractTextSchema,
  extractHandwritingSchema,
  evaluateAnswerSheetSchema,
  verifyIDCardSchema,
  detectFacesSchema,
  compareFacesSchema,
  markAttendanceSchema,
  processDocumentSchema,
  detectBoundariesSchema,
  resizeImageSchema,
  fileUploadSchema,
  batchProcessSchema
};
