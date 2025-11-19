const express = require('express');
const router = express.Router();
const nlpController = require('../controllers/nlp.controller');
const auth = require('../../../shared/middleware/auth');
const authorize = require('../../../shared/middleware/authorize');

/**
 * NLP Service Routes
 * All routes require authentication
 * Some routes require specific roles (teacher, admin)
 */

// =============================================
// ESSAY GRADING
// =============================================

/**
 * @swagger
 * /api/v1/nlp/essay/grade:
 *   post:
 *     summary: Grade an essay using NLP analysis
 *     tags: [NLP - Essay Grading]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 minLength: 50
 *                 description: Essay content to grade
 *               title:
 *                 type: string
 *                 maxLength: 255
 *                 description: Essay title
 *               wordCountRequirement:
 *                 type: integer
 *                 minimum: 0
 *                 description: Required word count
 *               rubric:
 *                 type: object
 *                 properties:
 *                   keywords:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Keywords to check for in essay
 *               studentId:
 *                 type: string
 *                 format: uuid
 *               assignmentId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Essay graded successfully
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
 *                     grade:
 *                       type: string
 *                       enum: [A+, A, A-, B+, B, B-, C+, C, C-, D, F]
 *                     score:
 *                       type: number
 *                       description: Overall score (0-100)
 *                     scores:
 *                       type: object
 *                       properties:
 *                         content:
 *                           type: number
 *                         structure:
 *                           type: number
 *                         grammar:
 *                           type: number
 *                         vocabulary:
 *                           type: number
 *                         coherence:
 *                           type: number
 *                         wordCount:
 *                           type: number
 *                     metrics:
 *                       type: object
 *                     feedback:
 *                       type: array
 *                       items:
 *                         type: string
 *                     strengths:
 *                       type: array
 *                       items:
 *                         type: string
 *                     improvements:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post(
  '/essay/grade',
  auth,
  authorize(['teacher', 'admin']),
  nlpController.gradeEssay
);

// =============================================
// PLAGIARISM DETECTION
// =============================================

/**
 * @swagger
 * /api/v1/nlp/plagiarism/check:
 *   post:
 *     summary: Check text for plagiarism
 *     tags: [NLP - Plagiarism Detection]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 minLength: 50
 *                 description: Text to check for plagiarism
 *               sources:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Source texts to compare against
 *               checkInternet:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to check against internet sources
 *               studentId:
 *                 type: string
 *                 format: uuid
 *               assignmentId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Plagiarism check completed
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
 *                     isPlagiarized:
 *                       type: boolean
 *                     plagiarismScore:
 *                       type: number
 *                       description: Percentage of plagiarized content
 *                     matches:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           sentence:
 *                             type: string
 *                           source:
 *                             type: integer
 *                           similarity:
 *                             type: number
 *                           type:
 *                             type: string
 *                             enum: [exact_match, high_similarity]
 *                     severity:
 *                       type: string
 *                       enum: [low, moderate, high, critical]
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/plagiarism/check',
  auth,
  authorize(['teacher', 'admin']),
  nlpController.checkPlagiarism
);

// =============================================
// QUESTION GENERATION
// =============================================

/**
 * @swagger
 * /api/v1/nlp/questions/generate:
 *   post:
 *     summary: Generate questions from text
 *     tags: [NLP - Question Generation]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 minLength: 100
 *                 description: Source text to generate questions from
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *                 default: 5
 *                 description: Number of questions to generate
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *                 description: Desired difficulty level
 *               questionTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [who, what, when, where, why, how]
 *                 description: Types of questions to generate
 *     responses:
 *       200:
 *         description: Questions generated successfully
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
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           question:
 *                             type: string
 *                           type:
 *                             type: string
 *                           difficulty:
 *                             type: string
 *                           context:
 *                             type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/questions/generate',
  auth,
  authorize(['teacher', 'admin']),
  nlpController.generateQuestions
);

// =============================================
// TEXT SUMMARIZATION
// =============================================

/**
 * @swagger
 * /api/v1/nlp/text/summarize:
 *   post:
 *     summary: Summarize text content
 *     tags: [NLP - Text Summarization]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 minLength: 200
 *                 description: Text to summarize
 *               maxSentences:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 default: 3
 *                 description: Maximum number of sentences in summary
 *               extractive:
 *                 type: boolean
 *                 default: true
 *                 description: Use extractive summarization
 *     responses:
 *       200:
 *         description: Text summarized successfully
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
 *                     summary:
 *                       type: string
 *                     originalLength:
 *                       type: integer
 *                     summaryLength:
 *                       type: integer
 *                     compressionRatio:
 *                       type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/text/summarize',
  auth,
  authorize(['teacher', 'admin', 'student']),
  nlpController.summarizeText
);

// =============================================
// SENTIMENT ANALYSIS
// =============================================

/**
 * @swagger
 * /api/v1/nlp/sentiment/analyze:
 *   post:
 *     summary: Analyze sentiment of text
 *     tags: [NLP - Sentiment Analysis]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 minLength: 10
 *                 description: Text to analyze
 *               detailed:
 *                 type: boolean
 *                 default: false
 *                 description: Return detailed sentence-level analysis
 *     responses:
 *       200:
 *         description: Sentiment analysis completed
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
 *                     sentiment:
 *                       type: string
 *                       enum: [very_positive, positive, neutral, negative, very_negative]
 *                     score:
 *                       type: number
 *                       description: Sentiment score (-1 to 1)
 *                     confidence:
 *                       type: number
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/sentiment/analyze',
  auth,
  authorize(['teacher', 'admin']),
  nlpController.analyzeSentiment
);

// =============================================
// SERVICE INFORMATION
// =============================================

/**
 * @swagger
 * /api/v1/nlp/capabilities:
 *   get:
 *     summary: Get NLP service capabilities
 *     tags: [NLP - Service Info]
 *     responses:
 *       200:
 *         description: Service capabilities retrieved
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
 *                     essayGrading:
 *                       type: object
 *                     plagiarismDetection:
 *                       type: object
 *                     questionGeneration:
 *                       type: object
 *                     textSummarization:
 *                       type: object
 *                     sentimentAnalysis:
 *                       type: object
 */
router.get('/capabilities', nlpController.getCapabilities);

/**
 * @swagger
 * /api/v1/nlp/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [NLP - Service Info]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', (req, res) => {
  res.json({
    service: 'Natural Language Processing Service',
    status: 'Active',
    version: '1.0.0',
    features: [
      'Essay grading with multi-criteria analysis',
      'Plagiarism detection',
      'Question generation from text',
      'Text summarization',
      'Sentiment analysis'
    ],
    algorithms: {
      essayGrading: ['content analysis', 'grammar check', 'vocabulary assessment', 'structure analysis', 'coherence', 'readability'],
      plagiarism: ['string similarity', 'sentence-level matching'],
      questions: ['NER', 'entity extraction', 'pattern matching'],
      summarization: ['TF-IDF', 'extractive summarization'],
      sentiment: ['lexicon-based', 'document-level', 'sentence-level']
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
