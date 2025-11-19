const express = require('express');
const router = express.Router();
const multer = require('multer');
const cvController = require('../controllers/cv.controller');
const auth = require('../../../shared/middleware/auth');
const authorize = require('../../../shared/middleware/authorize');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs only
    if (!file.mimetype.match(/^(image\/(jpeg|jpg|png|webp|tiff)|application\/pdf)$/)) {
      return cb(new Error('Only JPEG, PNG, WebP, TIFF, and PDF files are allowed'), false);
    }
    cb(null, true);
  }
});

/**
 * Computer Vision Service Routes
 * All routes require authentication
 * Some routes require specific roles
 */

// =============================================
// OCR - OPTICAL CHARACTER RECOGNITION
// =============================================

/**
 * @swagger
 * /api/v1/cv/ocr/extract:
 *   post:
 *     summary: Extract text from image using OCR
 *     tags: [CV - OCR]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to extract text from
 *               language:
 *                 type: string
 *                 enum: [eng, hin, spa, fra, deu, chi_sim, jpn, kor]
 *                 default: eng
 *               preprocessImage:
 *                 type: boolean
 *                 default: true
 *               confidence:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 60
 *     responses:
 *       200:
 *         description: Text extracted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/ocr/extract',
  auth,
  authorize(['teacher', 'admin', 'student']),
  upload.single('image'),
  cvController.extractText
);

/**
 * @swagger
 * /api/v1/cv/ocr/handwriting:
 *   post:
 *     summary: Extract handwritten text from image
 *     tags: [CV - OCR]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               language:
 *                 type: string
 *                 enum: [eng, hin]
 *                 default: eng
 *     responses:
 *       200:
 *         description: Handwriting extracted successfully
 */
router.post(
  '/ocr/handwriting',
  auth,
  authorize(['teacher', 'admin']),
  upload.single('image'),
  cvController.extractHandwriting
);

// =============================================
// ANSWER SHEET EVALUATION
// =============================================

/**
 * @swagger
 * /api/v1/cv/answer-sheet/evaluate:
 *   post:
 *     summary: Evaluate multiple choice answer sheet
 *     tags: [CV - Answer Sheet]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - answerKey
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Answer sheet image
 *               answerKey:
 *                 type: object
 *                 description: JSON object with correct answers
 *                 properties:
 *                   answers:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [A, B, C, D, E]
 *                   totalMarks:
 *                     type: integer
 *                     default: 100
 *     responses:
 *       200:
 *         description: Answer sheet evaluated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalQuestions:
 *                       type: integer
 *                     correct:
 *                       type: integer
 *                     incorrect:
 *                       type: integer
 *                     score:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                     grade:
 *                       type: string
 */
router.post(
  '/answer-sheet/evaluate',
  auth,
  authorize(['teacher', 'admin']),
  upload.single('image'),
  cvController.evaluateAnswerSheet
);

// =============================================
// ID CARD VERIFICATION
// =============================================

/**
 * @swagger
 * /api/v1/cv/id-card/verify:
 *   post:
 *     summary: Verify student ID card
 *     tags: [CV - ID Card]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               checkFace:
 *                 type: boolean
 *                 default: true
 *               extractInfo:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: ID card verified
 */
router.post(
  '/id-card/verify',
  auth,
  authorize(['teacher', 'admin', 'security']),
  upload.single('image'),
  cvController.verifyIDCard
);

// =============================================
// FACE DETECTION & RECOGNITION
// =============================================

/**
 * @swagger
 * /api/v1/cv/face/detect:
 *   post:
 *     summary: Detect faces in image
 *     tags: [CV - Face Detection]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               minConfidence:
 *                 type: number
 *                 default: 0.5
 *               maxFaces:
 *                 type: integer
 *                 default: 10
 *     responses:
 *       200:
 *         description: Faces detected
 */
router.post(
  '/face/detect',
  auth,
  authorize(['teacher', 'admin']),
  upload.single('image'),
  cvController.detectFaces
);

/**
 * @swagger
 * /api/v1/cv/attendance/mark:
 *   post:
 *     summary: Mark attendance using face recognition
 *     tags: [CV - Attendance]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - classId
 *               - sessionId
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               classId:
 *                 type: string
 *                 format: uuid
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Attendance marked
 */
router.post(
  '/attendance/mark',
  auth,
  authorize(['teacher', 'admin', 'student']),
  upload.single('image'),
  cvController.markAttendance
);

// =============================================
// DOCUMENT PROCESSING
// =============================================

/**
 * @swagger
 * /api/v1/cv/document/process:
 *   post:
 *     summary: Process and enhance document image
 *     tags: [CV - Document Processing]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               documentType:
 *                 type: string
 *                 enum: [report-card, certificate, transcript, assignment, general]
 *                 default: general
 *               deskew:
 *                 type: boolean
 *                 default: true
 *               removeNoise:
 *                 type: boolean
 *                 default: true
 *               extractText:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Document processed
 */
router.post(
  '/document/process',
  auth,
  authorize(['teacher', 'admin', 'student']),
  upload.single('image'),
  cvController.processDocument
);

/**
 * @swagger
 * /api/v1/cv/document/boundaries:
 *   post:
 *     summary: Detect document boundaries
 *     tags: [CV - Document Processing]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Boundaries detected
 */
router.post(
  '/document/boundaries',
  auth,
  authorize(['teacher', 'admin']),
  upload.single('image'),
  cvController.detectBoundaries
);

// =============================================
// IMAGE PROCESSING
// =============================================

/**
 * @swagger
 * /api/v1/cv/image/resize:
 *   post:
 *     summary: Resize image
 *     tags: [CV - Image Processing]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               width:
 *                 type: integer
 *               height:
 *                 type: integer
 *               quality:
 *                 type: integer
 *                 default: 80
 *     responses:
 *       200:
 *         description: Image resized
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 */
router.post(
  '/image/resize',
  auth,
  upload.single('image'),
  cvController.resizeImage
);

/**
 * @swagger
 * /api/v1/cv/image/metadata:
 *   post:
 *     summary: Get image metadata
 *     tags: [CV - Image Processing]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Metadata retrieved
 */
router.post(
  '/image/metadata',
  auth,
  upload.single('image'),
  cvController.getImageMetadata
);

// =============================================
// SERVICE INFORMATION
// =============================================

/**
 * @swagger
 * /api/v1/cv/capabilities:
 *   get:
 *     summary: Get computer vision service capabilities
 *     tags: [CV - Service Info]
 *     responses:
 *       200:
 *         description: Capabilities retrieved
 */
router.get('/capabilities', cvController.getCapabilities);

/**
 * @swagger
 * /api/v1/cv/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [CV - Service Info]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', (req, res) => {
  res.json({
    service: 'Computer Vision Service',
    status: 'Active',
    version: '1.0.0',
    features: [
      'OCR - Text extraction from images',
      'Handwriting recognition',
      'Answer sheet evaluation',
      'ID card verification',
      'Face detection and recognition',
      'Attendance marking via face recognition',
      'Document processing and enhancement',
      'Image manipulation'
    ],
    algorithms: {
      ocr: ['Tesseract.js', 'image preprocessing', 'multi-language support'],
      faceDetection: ['SSD MobileNet v1', 'face landmarks', 'face descriptors'],
      imageProcessing: ['Sharp', 'Jimp', 'format conversion'],
      answerSheet: ['bubble detection', 'automatic grading']
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 10MB limit'
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next();
});

module.exports = router;
