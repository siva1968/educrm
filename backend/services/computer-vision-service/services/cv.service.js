const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const canvas = require('canvas');
const faceapi = require('@vladmandic/face-api');
const Jimp = require('jimp');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Computer Vision Service
 * Handles OCR, face detection, document processing, and image analysis
 */
class ComputerVisionService {
  constructor() {
    this.tesseractWorker = null;
    this.faceApiInitialized = false;
    this.modelPath = path.join(__dirname, '../models');
  }

  /**
   * Initialize Tesseract worker
   */
  async initTesseract() {
    if (!this.tesseractWorker) {
      this.tesseractWorker = await Tesseract.createWorker('eng');
    }
    return this.tesseractWorker;
  }

  /**
   * Initialize face-api models
   */
  async initFaceApi() {
    if (!this.faceApiInitialized) {
      const { Canvas, Image, ImageData } = canvas;
      faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

      try {
        // Load face detection models
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(this.modelPath);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(this.modelPath);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(this.modelPath);
        this.faceApiInitialized = true;
        console.log('✓ Face-API models loaded successfully');
      } catch (error) {
        console.warn('⚠ Face-API models not found, face detection features disabled');
        console.log('To enable face detection, download models from: https://github.com/vladmandic/face-api');
      }
    }
  }

  // =============================================
  // OCR - OPTICAL CHARACTER RECOGNITION
  // =============================================

  /**
   * Extract text from image using OCR
   * @param {Buffer|string} imagePath - Image buffer or file path
   * @param {Object} options - OCR options
   */
  async extractText(imagePath, options = {}) {
    try {
      await this.initTesseract();

      const {
        language = 'eng',
        preprocessImage = true,
        confidence = 60
      } = options;

      // Preprocess image for better OCR accuracy
      let processedImage = imagePath;
      if (preprocessImage && Buffer.isBuffer(imagePath)) {
        processedImage = await this.preprocessImageForOCR(imagePath);
      }

      // Perform OCR
      const { data } = await this.tesseractWorker.recognize(processedImage);

      // Filter results by confidence
      const words = data.words.filter(word => word.confidence >= confidence);
      const lines = data.lines.filter(line => line.confidence >= confidence);

      return {
        text: data.text,
        confidence: data.confidence,
        words: words.map(w => ({
          text: w.text,
          confidence: Math.round(w.confidence),
          bbox: w.bbox
        })),
        lines: lines.map(l => ({
          text: l.text,
          confidence: Math.round(l.confidence),
          bbox: l.bbox
        })),
        blocks: data.blocks.map(b => ({
          text: b.text,
          confidence: Math.round(b.confidence),
          bbox: b.bbox
        })),
        language: data.language
      };
    } catch (error) {
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  /**
   * Preprocess image for better OCR results
   */
  async preprocessImageForOCR(imageBuffer) {
    try {
      const processed = await sharp(imageBuffer)
        .grayscale()
        .normalize()
        .sharpen()
        .threshold(128)
        .toBuffer();

      return processed;
    } catch (error) {
      throw new Error(`Image preprocessing failed: ${error.message}`);
    }
  }

  /**
   * Extract text from handwritten content
   */
  async extractHandwriting(imagePath, options = {}) {
    // For handwriting, use lower confidence threshold and special preprocessing
    const result = await this.extractText(imagePath, {
      ...options,
      confidence: 40,
      preprocessImage: true
    });

    return {
      ...result,
      note: 'Handwriting recognition has lower accuracy. Manual verification recommended.'
    };
  }

  // =============================================
  // ANSWER SHEET EVALUATION
  // =============================================

  /**
   * Evaluate multiple choice answer sheet
   * @param {Buffer} imageBuffer - Answer sheet image
   * @param {Object} answerKey - Correct answers
   */
  async evaluateAnswerSheet(imageBuffer, answerKey) {
    try {
      // Preprocess image
      const image = await Jimp.read(imageBuffer);
      await image.grayscale().contrast(0.5);

      // Detect answer bubbles
      const detectedAnswers = await this.detectBubbles(image);

      // Compare with answer key
      const results = this.gradeAnswers(detectedAnswers, answerKey);

      return {
        totalQuestions: answerKey.answers.length,
        attempted: detectedAnswers.length,
        correct: results.correctCount,
        incorrect: results.incorrectCount,
        unattempted: answerKey.answers.length - detectedAnswers.length,
        score: results.score,
        percentage: results.percentage,
        grade: this.calculateGrade(results.percentage),
        details: results.details,
        detectedAnswers
      };
    } catch (error) {
      throw new Error(`Answer sheet evaluation failed: ${error.message}`);
    }
  }

  /**
   * Detect filled bubbles in answer sheet
   */
  async detectBubbles(image) {
    // This is a simplified implementation
    // In production, use OpenCV for more accurate bubble detection

    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const detectedAnswers = [];

    // Assume standard answer sheet layout
    // Divide image into question rows and answer columns
    const questionsPerPage = 50;
    const optionsPerQuestion = 4; // A, B, C, D

    const rowHeight = Math.floor(height / questionsPerPage);
    const colWidth = Math.floor(width / optionsPerQuestion);

    for (let q = 0; q < questionsPerPage; q++) {
      const y = q * rowHeight;
      let selectedOption = null;
      let maxDarkness = 0;

      for (let opt = 0; opt < optionsPerQuestion; opt++) {
        const x = opt * colWidth;

        // Sample a region to check if bubble is filled
        const darkness = this.calculateRegionDarkness(image, x, y, colWidth, rowHeight);

        if (darkness > 0.6 && darkness > maxDarkness) {
          maxDarkness = darkness;
          selectedOption = String.fromCharCode(65 + opt); // A, B, C, D
        }
      }

      if (selectedOption) {
        detectedAnswers.push({
          questionNumber: q + 1,
          answer: selectedOption,
          confidence: Math.round(maxDarkness * 100)
        });
      }
    }

    return detectedAnswers;
  }

  /**
   * Calculate darkness of a region (to detect filled bubbles)
   */
  calculateRegionDarkness(image, x, y, width, height) {
    let totalDarkness = 0;
    let pixelCount = 0;

    for (let py = y; py < y + height && py < image.bitmap.height; py++) {
      for (let px = x; px < x + width && px < image.bitmap.width; px++) {
        const pixelColor = Jimp.intToRGBA(image.getPixelColor(px, py));
        const brightness = (pixelColor.r + pixelColor.g + pixelColor.b) / 3;
        totalDarkness += (255 - brightness) / 255; // Invert: darker = higher value
        pixelCount++;
      }
    }

    return pixelCount > 0 ? totalDarkness / pixelCount : 0;
  }

  /**
   * Grade detected answers against answer key
   */
  gradeAnswers(detectedAnswers, answerKey) {
    let correctCount = 0;
    let incorrectCount = 0;
    const details = [];

    answerKey.answers.forEach((correctAnswer, index) => {
      const questionNumber = index + 1;
      const detected = detectedAnswers.find(a => a.questionNumber === questionNumber);

      if (detected) {
        const isCorrect = detected.answer === correctAnswer;
        if (isCorrect) correctCount++;
        else incorrectCount++;

        details.push({
          questionNumber,
          studentAnswer: detected.answer,
          correctAnswer,
          isCorrect,
          confidence: detected.confidence
        });
      } else {
        details.push({
          questionNumber,
          studentAnswer: null,
          correctAnswer,
          isCorrect: false,
          status: 'unattempted'
        });
      }
    });

    const totalQuestions = answerKey.answers.length;
    const score = (correctCount / totalQuestions) * (answerKey.totalMarks || 100);
    const percentage = (correctCount / totalQuestions) * 100;

    return {
      correctCount,
      incorrectCount,
      score: Math.round(score * 10) / 10,
      percentage: Math.round(percentage * 10) / 10,
      details
    };
  }

  /**
   * Calculate letter grade from percentage
   */
  calculateGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'A-';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 65) return 'B-';
    if (percentage >= 60) return 'C+';
    if (percentage >= 55) return 'C';
    if (percentage >= 50) return 'C-';
    if (percentage >= 40) return 'D';
    return 'F';
  }

  // =============================================
  // ID CARD VERIFICATION
  // =============================================

  /**
   * Verify student ID card
   * @param {Buffer} imageBuffer - ID card image
   */
  async verifyIDCard(imageBuffer) {
    try {
      // Extract text from ID card
      const ocrResult = await this.extractText(imageBuffer, {
        preprocessImage: true,
        confidence: 70
      });

      // Extract relevant information
      const extractedInfo = this.parseIDCardInfo(ocrResult.text);

      // Detect face in ID card
      const faceDetection = await this.detectFaces(imageBuffer);

      // Validate ID card format
      const validation = this.validateIDCardFormat(extractedInfo, faceDetection);

      return {
        valid: validation.isValid,
        confidence: validation.confidence,
        extractedInfo,
        faceDetected: faceDetection.faces.length > 0,
        faceCount: faceDetection.faces.length,
        issues: validation.issues,
        warnings: validation.warnings,
        ocrConfidence: ocrResult.confidence
      };
    } catch (error) {
      throw new Error(`ID card verification failed: ${error.message}`);
    }
  }

  /**
   * Parse ID card information from OCR text
   */
  parseIDCardInfo(text) {
    const info = {
      studentId: null,
      name: null,
      dateOfBirth: null,
      class: null,
      validUntil: null
    };

    // Extract student ID (e.g., STU12345, 2023-CS-001)
    const idPattern = /(?:ID|Student ID|Roll No)[:\s]*([A-Z0-9-]+)/i;
    const idMatch = text.match(idPattern);
    if (idMatch) info.studentId = idMatch[1];

    // Extract name (often after "Name:" label)
    const namePattern = /(?:Name)[:\s]*([A-Z][a-z]+(?: [A-Z][a-z]+)+)/i;
    const nameMatch = text.match(namePattern);
    if (nameMatch) info.name = nameMatch[1];

    // Extract date of birth
    const dobPattern = /(?:DOB|Date of Birth)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i;
    const dobMatch = text.match(dobPattern);
    if (dobMatch) info.dateOfBirth = dobMatch[1];

    // Extract class/grade
    const classPattern = /(?:Class|Grade)[:\s]*(\d+[A-Z]?)/i;
    const classMatch = text.match(classPattern);
    if (classMatch) info.class = classMatch[1];

    // Extract validity
    const validPattern = /(?:Valid Until|Valid Till)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i;
    const validMatch = text.match(validPattern);
    if (validMatch) info.validUntil = validMatch[1];

    return info;
  }

  /**
   * Validate ID card format
   */
  validateIDCardFormat(extractedInfo, faceDetection) {
    const issues = [];
    const warnings = [];
    let confidence = 100;

    // Check if student ID is present
    if (!extractedInfo.studentId) {
      issues.push('Student ID not detected');
      confidence -= 30;
    }

    // Check if name is present
    if (!extractedInfo.name) {
      issues.push('Name not detected');
      confidence -= 20;
    }

    // Check if face is detected
    if (faceDetection.faces.length === 0) {
      issues.push('No face detected in ID card');
      confidence -= 30;
    } else if (faceDetection.faces.length > 1) {
      warnings.push('Multiple faces detected');
      confidence -= 10;
    }

    // Check face quality
    if (faceDetection.faces.length > 0) {
      const face = faceDetection.faces[0];
      if (face.detection.score < 0.8) {
        warnings.push('Low face detection confidence');
        confidence -= 10;
      }
    }

    const isValid = issues.length === 0 && confidence >= 60;

    return {
      isValid,
      confidence: Math.max(0, confidence),
      issues,
      warnings
    };
  }

  // =============================================
  // FACE DETECTION & RECOGNITION
  // =============================================

  /**
   * Detect faces in image
   * @param {Buffer} imageBuffer - Image buffer
   */
  async detectFaces(imageBuffer, options = {}) {
    try {
      await this.initFaceApi();

      if (!this.faceApiInitialized) {
        return {
          faces: [],
          error: 'Face detection models not loaded'
        };
      }

      // Load image
      const image = await canvas.loadImage(imageBuffer);

      // Detect faces with landmarks and descriptors
      const detections = await faceapi
        .detectAllFaces(image)
        .withFaceLandmarks()
        .withFaceDescriptors();

      const faces = detections.map((detection, index) => ({
        id: index,
        detection: {
          box: detection.detection.box,
          score: Math.round(detection.detection.score * 100) / 100
        },
        landmarks: detection.landmarks.positions.length,
        descriptor: detection.descriptor
      }));

      return {
        faces,
        faceCount: faces.length,
        imageWidth: image.width,
        imageHeight: image.height
      };
    } catch (error) {
      console.error('Face detection error:', error.message);
      return {
        faces: [],
        error: error.message
      };
    }
  }

  /**
   * Compare two faces for similarity
   * @param {Array} descriptor1 - Face descriptor from first image
   * @param {Array} descriptor2 - Face descriptor from second image
   */
  compareFaces(descriptor1, descriptor2) {
    if (!descriptor1 || !descriptor2) {
      throw new Error('Both face descriptors are required');
    }

    const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
    const similarity = Math.max(0, Math.min(100, (1 - distance) * 100));

    return {
      distance,
      similarity: Math.round(similarity * 100) / 100,
      match: distance < 0.6, // Threshold for face match
      confidence: similarity >= 70 ? 'high' : similarity >= 50 ? 'medium' : 'low'
    };
  }

  /**
   * Mark attendance using face recognition
   * @param {Buffer} imageBuffer - Student photo
   * @param {Array} registeredFaces - Array of registered face descriptors
   */
  async markAttendanceByFace(imageBuffer, registeredFaces) {
    try {
      // Detect faces in the image
      const detection = await this.detectFaces(imageBuffer);

      if (detection.faces.length === 0) {
        return {
          success: false,
          message: 'No face detected in the image'
        };
      }

      if (detection.faces.length > 1) {
        return {
          success: false,
          message: 'Multiple faces detected. Please ensure only one person in frame.'
        };
      }

      const detectedFace = detection.faces[0];
      const matches = [];

      // Compare with registered faces
      for (const registered of registeredFaces) {
        const comparison = this.compareFaces(detectedFace.descriptor, registered.descriptor);

        if (comparison.match) {
          matches.push({
            studentId: registered.studentId,
            studentName: registered.studentName,
            similarity: comparison.similarity,
            confidence: comparison.confidence
          });
        }
      }

      // Sort by similarity
      matches.sort((a, b) => b.similarity - a.similarity);

      if (matches.length === 0) {
        return {
          success: false,
          message: 'No matching face found in registered database'
        };
      }

      return {
        success: true,
        match: matches[0],
        alternativeMatches: matches.slice(1, 3), // Top 2 alternative matches
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Attendance marking failed: ${error.message}`);
    }
  }

  // =============================================
  // DOCUMENT PROCESSING
  // =============================================

  /**
   * Process and enhance document image
   * @param {Buffer} imageBuffer - Document image
   */
  async processDocument(imageBuffer, options = {}) {
    try {
      const {
        deskew = true,
        removeNoise = true,
        enhanceContrast = true,
        outputFormat = 'png'
      } = options;

      let image = sharp(imageBuffer);

      // Convert to grayscale
      image = image.grayscale();

      // Enhance contrast
      if (enhanceContrast) {
        image = image.normalize().sharpen();
      }

      // Remove noise (denoise)
      if (removeNoise) {
        image = image.median(3);
      }

      // Get processed image
      const processedBuffer = await image.toFormat(outputFormat).toBuffer();

      // Extract text
      const ocrResult = await this.extractText(processedBuffer, {
        preprocessImage: false
      });

      return {
        processedImage: processedBuffer.toString('base64'),
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        wordCount: ocrResult.words.length,
        lineCount: ocrResult.lines.length
      };
    } catch (error) {
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }

  /**
   * Detect document boundaries
   */
  async detectDocumentBoundaries(imageBuffer) {
    try {
      const image = await Jimp.read(imageBuffer);
      const { width, height } = image.bitmap;

      // Simplified edge detection
      // In production, use OpenCV's Canny edge detection and Hough transform

      return {
        detected: true,
        boundaries: {
          topLeft: { x: 0, y: 0 },
          topRight: { x: width, y: 0 },
          bottomLeft: { x: 0, y: height },
          bottomRight: { x: width, y: height }
        },
        width,
        height,
        aspectRatio: (width / height).toFixed(2),
        note: 'Using simplified boundary detection. For production, implement OpenCV-based detection.'
      };
    } catch (error) {
      throw new Error(`Boundary detection failed: ${error.message}`);
    }
  }

  /**
   * Extract information from various document types
   */
  async extractDocumentInfo(imageBuffer, documentType) {
    const ocrResult = await this.extractText(imageBuffer);

    let extractedData = {};

    switch (documentType) {
      case 'report-card':
        extractedData = this.parseReportCard(ocrResult.text);
        break;
      case 'certificate':
        extractedData = this.parseCertificate(ocrResult.text);
        break;
      case 'transcript':
        extractedData = this.parseTranscript(ocrResult.text);
        break;
      default:
        extractedData = { text: ocrResult.text };
    }

    return {
      documentType,
      extractedData,
      ocrConfidence: ocrResult.confidence,
      fullText: ocrResult.text
    };
  }

  /**
   * Parse report card information
   */
  parseReportCard(text) {
    return {
      studentName: this.extractPattern(text, /(?:Student Name|Name)[:\s]*([A-Z][a-z]+(?: [A-Z][a-z]+)+)/i),
      studentId: this.extractPattern(text, /(?:Student ID|Roll No)[:\s]*([A-Z0-9-]+)/i),
      class: this.extractPattern(text, /(?:Class|Grade)[:\s]*(\d+[A-Z]?)/i),
      term: this.extractPattern(text, /(?:Term|Semester)[:\s]*(\d+)/i),
      academicYear: this.extractPattern(text, /(?:Academic Year|Year)[:\s]*(\d{4}[-\/]\d{2,4})/i)
    };
  }

  /**
   * Parse certificate information
   */
  parseCertificate(text) {
    return {
      recipientName: this.extractPattern(text, /(?:This is to certify that|awarded to)[:\s]*([A-Z][a-z]+(?: [A-Z][a-z]+)+)/i),
      certificateType: this.extractPattern(text, /(?:Certificate of)[:\s]*([A-Za-z\s]+)/i),
      issueDate: this.extractPattern(text, /(?:Date|Issued on)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i)
    };
  }

  /**
   * Parse transcript information
   */
  parseTranscript(text) {
    return {
      studentName: this.extractPattern(text, /(?:Student Name|Name)[:\s]*([A-Z][a-z]+(?: [A-Z][a-z]+)+)/i),
      degree: this.extractPattern(text, /(?:Degree|Program)[:\s]*([A-Za-z\s]+)/i),
      gpa: this.extractPattern(text, /(?:GPA|CGPA)[:\s]*(\d+\.\d+)/i)
    };
  }

  /**
   * Extract pattern from text
   */
  extractPattern(text, pattern) {
    const match = text.match(pattern);
    return match ? match[1] : null;
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  /**
   * Get image metadata
   */
  async getImageMetadata(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();

      return {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        size: imageBuffer.length
      };
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error.message}`);
    }
  }

  /**
   * Resize image
   */
  async resizeImage(imageBuffer, width, height, options = {}) {
    const { fit = 'inside', format = 'jpeg', quality = 80 } = options;

    try {
      const resized = await sharp(imageBuffer)
        .resize(width, height, { fit })
        .toFormat(format, { quality })
        .toBuffer();

      return resized;
    } catch (error) {
      throw new Error(`Image resize failed: ${error.message}`);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
  }
}

module.exports = new ComputerVisionService();
