const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cvRoutes = require('./routes');
const errorHandler = require('../../shared/middleware/errorHandler');

const app = express();
const PORT = process.env.CV_SERVICE_PORT || 4002;

// =============================================
// MIDDLEWARE
// =============================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Request ID middleware
app.use((req, res, next) => {
  req.id = require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// =============================================
// ROOT ENDPOINT
// =============================================

app.get('/', (req, res) => {
  res.json({
    service: 'Computer Vision Service',
    status: 'Running',
    version: '1.0.0',
    description: 'Advanced computer vision capabilities for educational content processing',
    features: {
      ocr: {
        enabled: true,
        description: 'Text extraction from images using Tesseract OCR',
        languages: ['English', 'Hindi', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean']
      },
      handwritingRecognition: {
        enabled: true,
        description: 'Extract handwritten text from images',
        accuracy: '70-80%'
      },
      answerSheetEvaluation: {
        enabled: true,
        description: 'Automatic grading of multiple choice answer sheets',
        maxQuestions: 200
      },
      idCardVerification: {
        enabled: true,
        description: 'Verify and extract information from student ID cards'
      },
      faceDetection: {
        enabled: true,
        description: 'Detect and recognize faces for attendance',
        note: 'Requires face-api models'
      },
      documentProcessing: {
        enabled: true,
        description: 'Process and enhance document images'
      },
      imageProcessing: {
        enabled: true,
        description: 'Resize, crop, and manipulate images'
      }
    },
    endpoints: {
      health: '/api/v1/cv/health',
      capabilities: '/api/v1/cv/capabilities',
      ocrExtract: 'POST /api/v1/cv/ocr/extract',
      handwriting: 'POST /api/v1/cv/ocr/handwriting',
      evaluateAnswerSheet: 'POST /api/v1/cv/answer-sheet/evaluate',
      verifyIDCard: 'POST /api/v1/cv/id-card/verify',
      detectFaces: 'POST /api/v1/cv/face/detect',
      markAttendance: 'POST /api/v1/cv/attendance/mark',
      processDocument: 'POST /api/v1/cv/document/process',
      detectBoundaries: 'POST /api/v1/cv/document/boundaries',
      resizeImage: 'POST /api/v1/cv/image/resize',
      imageMetadata: 'POST /api/v1/cv/image/metadata'
    },
    timestamp: new Date().toISOString()
  });
});

// =============================================
// API ROUTES
// =============================================

app.use('/api/v1/cv', cvRoutes);

// =============================================
// METRICS ENDPOINT (for Prometheus)
// =============================================

let requestCount = 0;
let errorCount = 0;
let processingTime = [];
let ocrOperations = 0;
let faceDetections = 0;
let answerSheetEvaluations = 0;

app.use((req, res, next) => {
  const start = Date.now();
  requestCount++;

  // Track operation types
  if (req.path.includes('/ocr/')) ocrOperations++;
  if (req.path.includes('/face/')) faceDetections++;
  if (req.path.includes('/answer-sheet/')) answerSheetEvaluations++;

  res.on('finish', () => {
    const duration = Date.now() - start;
    processingTime.push(duration);

    // Keep only last 1000 measurements
    if (processingTime.length > 1000) {
      processingTime.shift();
    }

    if (res.statusCode >= 500) {
      errorCount++;
    }
  });

  next();
});

app.get('/metrics', (req, res) => {
  const avgProcessingTime = processingTime.length > 0
    ? processingTime.reduce((a, b) => a + b, 0) / processingTime.length
    : 0;

  const metrics = {
    // Service metrics
    cv_service_up: 1,
    cv_requests_total: requestCount,
    cv_errors_total: errorCount,
    cv_request_duration_ms: Math.round(avgProcessingTime),

    // Business metrics
    cv_ocr_operations_total: ocrOperations,
    cv_face_detections_total: faceDetections,
    cv_answer_sheets_evaluated_total: answerSheetEvaluations
  };

  // Prometheus format
  let prometheusMetrics = '';
  for (const [key, value] of Object.entries(metrics)) {
    prometheusMetrics += `${key} ${value}\n`;
  }

  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics);
});

// =============================================
// ERROR HANDLING
// =============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    service: 'computer-vision-service'
  });
});

// Global error handler
app.use(errorHandler);

// =============================================
// GRACEFUL SHUTDOWN
// =============================================

process.on('SIGTERM', () => {
  console.log('📊 SIGTERM signal received: closing Computer Vision service gracefully');
  server.close(() => {
    console.log('✅ Computer Vision service closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📊 SIGINT signal received: closing Computer Vision service gracefully');
  server.close(() => {
    console.log('✅ Computer Vision service closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// =============================================
// START SERVER
// =============================================

let server;

if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log('');
    console.log('👁️  ============================================');
    console.log('   Computer Vision Service');
    console.log('   ============================================');
    console.log(`   Status: Running`);
    console.log(`   Port: ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   PID: ${process.pid}`);
    console.log('');
    console.log('   📍 Endpoints:');
    console.log(`      Health: http://localhost:${PORT}/api/v1/cv/health`);
    console.log(`      Capabilities: http://localhost:${PORT}/api/v1/cv/capabilities`);
    console.log(`      Metrics: http://localhost:${PORT}/metrics`);
    console.log('');
    console.log('   🎯 Features:');
    console.log('      ✓ OCR - Text extraction (Tesseract.js)');
    console.log('      ✓ Handwriting recognition');
    console.log('      ✓ Answer sheet evaluation');
    console.log('      ✓ ID card verification');
    console.log('      ✓ Face detection & recognition');
    console.log('      ✓ Attendance via face recognition');
    console.log('      ✓ Document processing & enhancement');
    console.log('      ✓ Image manipulation & metadata');
    console.log('');
    console.log('   🔧 Technologies:');
    console.log('      • Tesseract.js - OCR engine');
    console.log('      • Sharp - High-performance image processing');
    console.log('      • face-api.js - Face detection & recognition');
    console.log('      • Jimp - Image manipulation');
    console.log('      • TensorFlow.js - ML operations');
    console.log('');
    console.log('   ⚠️  Note:');
    console.log('      Face detection requires face-api models.');
    console.log('      Download from: https://github.com/vladmandic/face-api');
    console.log('      Place models in: ./models/');
    console.log('');
    console.log('============================================ 👁️');
    console.log('');
  });
}

module.exports = app;
