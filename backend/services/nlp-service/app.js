const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const nlpRoutes = require('./routes');
const errorHandler = require('../../shared/middleware/errorHandler');

const app = express();
const PORT = process.env.NLP_SERVICE_PORT || 4001;

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
    service: 'Natural Language Processing Service',
    status: 'Running',
    version: '1.0.0',
    description: 'Advanced NLP capabilities for educational content analysis',
    features: {
      essayGrading: {
        enabled: true,
        description: 'Multi-criteria essay grading with detailed feedback'
      },
      plagiarismDetection: {
        enabled: true,
        description: 'Sentence-level plagiarism detection using string similarity'
      },
      questionGeneration: {
        enabled: true,
        description: 'Automatic question generation from text using NER'
      },
      textSummarization: {
        enabled: true,
        description: 'Extractive summarization using TF-IDF scoring'
      },
      sentimentAnalysis: {
        enabled: true,
        description: 'Document and sentence-level sentiment analysis'
      }
    },
    endpoints: {
      health: '/api/v1/nlp/health',
      capabilities: '/api/v1/nlp/capabilities',
      essayGrade: 'POST /api/v1/nlp/essay/grade',
      plagiarismCheck: 'POST /api/v1/nlp/plagiarism/check',
      generateQuestions: 'POST /api/v1/nlp/questions/generate',
      summarizeText: 'POST /api/v1/nlp/text/summarize',
      analyzeSentiment: 'POST /api/v1/nlp/sentiment/analyze'
    },
    timestamp: new Date().toISOString()
  });
});

// =============================================
// API ROUTES
// =============================================

app.use('/api/v1/nlp', nlpRoutes);

// =============================================
// METRICS ENDPOINT (for Prometheus)
// =============================================

let requestCount = 0;
let errorCount = 0;
let processingTime = [];

app.use((req, res, next) => {
  const start = Date.now();
  requestCount++;

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
    nlp_service_up: 1,
    nlp_requests_total: requestCount,
    nlp_errors_total: errorCount,
    nlp_request_duration_ms: Math.round(avgProcessingTime),

    // Business metrics
    nlp_essays_graded_total: 0, // TODO: Implement counters
    nlp_plagiarism_checks_total: 0,
    nlp_questions_generated_total: 0,
    nlp_texts_summarized_total: 0,
    nlp_sentiments_analyzed_total: 0
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
    service: 'nlp-service'
  });
});

// Global error handler
app.use(errorHandler);

// =============================================
// GRACEFUL SHUTDOWN
// =============================================

process.on('SIGTERM', () => {
  console.log('📊 SIGTERM signal received: closing NLP service gracefully');
  server.close(() => {
    console.log('✅ NLP service closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📊 SIGINT signal received: closing NLP service gracefully');
  server.close(() => {
    console.log('✅ NLP service closed');
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
    console.log('🧠 ============================================');
    console.log('   Natural Language Processing Service');
    console.log('   ============================================');
    console.log(`   Status: Running`);
    console.log(`   Port: ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   PID: ${process.pid}`);
    console.log('');
    console.log('   📍 Endpoints:');
    console.log(`      Health: http://localhost:${PORT}/api/v1/nlp/health`);
    console.log(`      Capabilities: http://localhost:${PORT}/api/v1/nlp/capabilities`);
    console.log(`      Metrics: http://localhost:${PORT}/metrics`);
    console.log('');
    console.log('   🎯 Features:');
    console.log('      ✓ Essay grading with multi-criteria analysis');
    console.log('      ✓ Plagiarism detection (string similarity)');
    console.log('      ✓ Question generation from text');
    console.log('      ✓ Text summarization (TF-IDF)');
    console.log('      ✓ Sentiment analysis (document & sentence)');
    console.log('');
    console.log('   🔧 Algorithms:');
    console.log('      • Natural.js - Tokenization, stemming, classification');
    console.log('      • Compromise.js - NER, entity extraction');
    console.log('      • TF-IDF - Document importance scoring');
    console.log('      • Flesch Reading Ease - Readability assessment');
    console.log('      • String Similarity - Plagiarism detection');
    console.log('');
    console.log('============================================ 🧠');
    console.log('');
  });
}

module.exports = app;
