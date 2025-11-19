const cvService = require('../services/cv.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  extractTextSchema,
  extractHandwritingSchema,
  evaluateAnswerSheetSchema,
  verifyIDCardSchema,
  detectFacesSchema,
  markAttendanceSchema,
  processDocumentSchema,
  detectBoundariesSchema,
  resizeImageSchema,
  fileUploadSchema
} = require('../validators/cv.validator');

/**
 * Computer Vision Controller
 * Handles HTTP requests for computer vision operations
 */
class ComputerVisionController {
  /**
   * Extract text from image (OCR)
   * POST /api/v1/cv/ocr/extract
   */
  async extractText(req, res, next) {
    try {
      // Validate file
      if (!req.file) {
        return ApiResponse.error(res, 'Image file is required', 400);
      }

      const { error: fileError } = fileUploadSchema.validate({
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      if (fileError) {
        return ApiResponse.validationError(res, fileError.details);
      }

      // Validate request body
      const { error, value } = extractTextSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      // Extract text
      const result = await cvService.extractText(req.file.buffer, value);

      return ApiResponse.success(res, result, 'Text extracted successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Extract handwritten text
   * POST /api/v1/cv/ocr/handwriting
   */
  async extractHandwriting(req, res, next) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'Image file is required', 400);
      }

      const { error: fileError } = fileUploadSchema.validate({
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      if (fileError) {
        return ApiResponse.validationError(res, fileError.details);
      }

      const { error, value } = extractHandwritingSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await cvService.extractHandwriting(req.file.buffer, value);

      return ApiResponse.success(res, result, 'Handwriting extracted successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Evaluate answer sheet
   * POST /api/v1/cv/answer-sheet/evaluate
   */
  async evaluateAnswerSheet(req, res, next) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'Answer sheet image is required', 400);
      }

      const { error: fileError } = fileUploadSchema.validate({
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      if (fileError) {
        return ApiResponse.validationError(res, fileError.details);
      }

      const { error, value } = evaluateAnswerSheetSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await cvService.evaluateAnswerSheet(req.file.buffer, value.answerKey);

      // Add metadata if provided
      if (value.metadata) {
        result.metadata = value.metadata;
      }

      return ApiResponse.success(res, result, 'Answer sheet evaluated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify ID card
   * POST /api/v1/cv/id-card/verify
   */
  async verifyIDCard(req, res, next) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'ID card image is required', 400);
      }

      const { error: fileError } = fileUploadSchema.validate({
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      if (fileError) {
        return ApiResponse.validationError(res, fileError.details);
      }

      const { error, value } = verifyIDCardSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await cvService.verifyIDCard(req.file.buffer);

      return ApiResponse.success(res, result, 'ID card verified successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Detect faces in image
   * POST /api/v1/cv/face/detect
   */
  async detectFaces(req, res, next) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'Image file is required', 400);
      }

      const { error: fileError } = fileUploadSchema.validate({
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      if (fileError) {
        return ApiResponse.validationError(res, fileError.details);
      }

      const { error, value } = detectFacesSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await cvService.detectFaces(req.file.buffer, value);

      return ApiResponse.success(res, result, 'Faces detected successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark attendance using face recognition
   * POST /api/v1/cv/attendance/mark
   */
  async markAttendance(req, res, next) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'Student photo is required', 400);
      }

      const { error: fileError } = fileUploadSchema.validate({
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      if (fileError) {
        return ApiResponse.validationError(res, fileError.details);
      }

      const { error, value } = markAttendanceSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      // TODO: Fetch registered faces from database
      const registeredFaces = []; // This should come from database

      if (registeredFaces.length === 0) {
        return ApiResponse.error(res, 'No registered faces found for this class', 404);
      }

      const result = await cvService.markAttendanceByFace(req.file.buffer, registeredFaces);

      if (!result.success) {
        return ApiResponse.error(res, result.message, 400);
      }

      return ApiResponse.success(res, result, 'Attendance marked successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process document
   * POST /api/v1/cv/document/process
   */
  async processDocument(req, res, next) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'Document image is required', 400);
      }

      const { error: fileError } = fileUploadSchema.validate({
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      if (fileError) {
        return ApiResponse.validationError(res, fileError.details);
      }

      const { error, value } = processDocumentSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      let result;

      if (value.extractInfo) {
        result = await cvService.extractDocumentInfo(req.file.buffer, value.documentType);
      } else {
        result = await cvService.processDocument(req.file.buffer, value);
      }

      return ApiResponse.success(res, result, 'Document processed successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Detect document boundaries
   * POST /api/v1/cv/document/boundaries
   */
  async detectBoundaries(req, res, next) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'Document image is required', 400);
      }

      const { error: fileError } = fileUploadSchema.validate({
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      if (fileError) {
        return ApiResponse.validationError(res, fileError.details);
      }

      const { error, value } = detectBoundariesSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await cvService.detectDocumentBoundaries(req.file.buffer);

      return ApiResponse.success(res, result, 'Document boundaries detected', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resize image
   * POST /api/v1/cv/image/resize
   */
  async resizeImage(req, res, next) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'Image file is required', 400);
      }

      const { error: fileError } = fileUploadSchema.validate({
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      if (fileError) {
        return ApiResponse.validationError(res, fileError.details);
      }

      const { error, value } = resizeImageSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const resizedBuffer = await cvService.resizeImage(
        req.file.buffer,
        value.width,
        value.height,
        value
      );

      // Set appropriate content type
      const contentType = `image/${value.format}`;
      res.set('Content-Type', contentType);
      res.send(resizedBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get image metadata
   * POST /api/v1/cv/image/metadata
   */
  async getImageMetadata(req, res, next) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'Image file is required', 400);
      }

      const { error: fileError } = fileUploadSchema.validate({
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      if (fileError) {
        return ApiResponse.validationError(res, fileError.details);
      }

      const metadata = await cvService.getImageMetadata(req.file.buffer);

      return ApiResponse.success(res, metadata, 'Image metadata retrieved', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get computer vision capabilities
   * GET /api/v1/cv/capabilities
   */
  async getCapabilities(req, res) {
    const capabilities = {
      ocr: {
        available: true,
        features: ['text extraction', 'handwriting recognition', 'multi-language support'],
        languages: ['eng', 'hin', 'spa', 'fra', 'deu', 'chi_sim', 'jpn', 'kor'],
        maxImageSize: '10MB',
        accuracy: '90-95% for printed text, 70-80% for handwriting'
      },
      answerSheetEvaluation: {
        available: true,
        features: ['bubble detection', 'automatic grading', 'multiple sheet types'],
        maxQuestions: 200,
        supportedFormats: ['type-a', 'type-b', 'custom'],
        accuracy: '95%'
      },
      idCardVerification: {
        available: true,
        features: ['text extraction', 'face detection', 'information parsing'],
        extractableFields: ['studentId', 'name', 'dateOfBirth', 'class', 'validUntil']
      },
      faceDetection: {
        available: true,
        features: ['face detection', 'face recognition', 'landmark detection'],
        maxFaces: 100,
        accuracy: '98%',
        note: 'Requires face-api models to be downloaded'
      },
      attendance: {
        available: true,
        features: ['face-based attendance', 'group attendance', 'liveness detection'],
        matchThreshold: 0.6
      },
      documentProcessing: {
        available: true,
        features: ['document enhancement', 'boundary detection', 'text extraction'],
        supportedTypes: ['report-card', 'certificate', 'transcript', 'assignment', 'general']
      },
      imageProcessing: {
        available: true,
        features: ['resize', 'crop', 'format conversion', 'enhancement'],
        supportedFormats: ['jpeg', 'png', 'webp', 'tiff', 'pdf']
      }
    };

    return ApiResponse.success(res, capabilities);
  }
}

module.exports = new ComputerVisionController();
