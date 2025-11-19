const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/prediction.controller');
const auth = require('../../../shared/middleware/auth');
const authorize = require('../../../shared/middleware/authorize');

/**
 * Prediction Engine Service Routes
 * All routes require authentication
 * Most routes require teacher/admin roles
 */

// =============================================
// PERFORMANCE PREDICTION
// =============================================

/**
 * @swagger
 * /api/v1/predictions/performance:
 *   post:
 *     summary: Predict student performance
 *     tags: [Predictions - Performance]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - historicalGrades
 *             properties:
 *               studentId:
 *                 type: string
 *                 format: uuid
 *               historicalGrades:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Array of historical grades
 *               attendance:
 *                 type: array
 *                 items:
 *                   type: number
 *               assignmentScores:
 *                 type: array
 *                 items:
 *                   type: number
 *               testScores:
 *                 type: array
 *                 items:
 *                   type: number
 *     responses:
 *       200:
 *         description: Performance prediction completed
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
 *                     nextTermGrade:
 *                       type: number
 *                     finalGrade:
 *                       type: number
 *                     improvementTrend:
 *                       type: object
 *                     riskLevel:
 *                       type: object
 *                     recommendations:
 *                       type: array
 */
router.post(
  '/performance',
  auth,
  authorize(['teacher', 'admin', 'counselor']),
  predictionController.predictPerformance
);

// =============================================
// DROPOUT RISK PREDICTION
// =============================================

/**
 * @swagger
 * /api/v1/predictions/dropout-risk:
 *   post:
 *     summary: Predict student dropout risk
 *     tags: [Predictions - Dropout]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - academicPerformance
 *               - attendance
 *             properties:
 *               studentId:
 *                 type: string
 *                 format: uuid
 *               academicPerformance:
 *                 type: object
 *                 properties:
 *                   gpa:
 *                     type: number
 *                   failedCourses:
 *                     type: integer
 *               attendance:
 *                 type: object
 *                 properties:
 *                   rate:
 *                     type: number
 *     responses:
 *       200:
 *         description: Dropout risk prediction completed
 */
router.post(
  '/dropout-risk',
  auth,
  authorize(['teacher', 'admin', 'counselor']),
  predictionController.predictDropoutRisk
);

// =============================================
// CAREER PATH RECOMMENDATIONS
// =============================================

/**
 * @swagger
 * /api/v1/predictions/career-paths:
 *   post:
 *     summary: Recommend career paths based on student profile
 *     tags: [Predictions - Career]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - interests
 *               - grades
 *             properties:
 *               studentId:
 *                 type: string
 *                 format: uuid
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *               grades:
 *                 type: object
 *                 additionalProperties:
 *                   type: number
 *     responses:
 *       200:
 *         description: Career paths recommended
 */
router.post(
  '/career-paths',
  auth,
  authorize(['teacher', 'admin', 'counselor', 'student']),
  predictionController.recommendCareerPaths
);

// =============================================
// COURSE RECOMMENDATIONS
// =============================================

/**
 * @swagger
 * /api/v1/predictions/courses:
 *   post:
 *     summary: Recommend courses for student
 *     tags: [Predictions - Courses]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - currentGrade
 *             properties:
 *               studentId:
 *                 type: string
 *                 format: uuid
 *               currentGrade:
 *                 type: integer
 *                 minimum: 9
 *                 maximum: 12
 *               completedCourses:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Courses recommended
 */
router.post(
  '/courses',
  auth,
  authorize(['teacher', 'admin', 'counselor', 'student']),
  predictionController.recommendCourses
);

// =============================================
// GRADE PREDICTION
// =============================================

/**
 * @swagger
 * /api/v1/predictions/grade:
 *   post:
 *     summary: Predict final grade for a course
 *     tags: [Predictions - Grades]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - courseId
 *               - currentGrade
 *               - historicalPerformance
 *             properties:
 *               studentId:
 *                 type: string
 *                 format: uuid
 *               courseId:
 *                 type: string
 *                 format: uuid
 *               currentGrade:
 *                 type: number
 *               assignmentsRemaining:
 *                 type: integer
 *               testsRemaining:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Grade prediction completed
 */
router.post(
  '/grade',
  auth,
  authorize(['teacher', 'admin', 'student']),
  predictionController.predictGrade
);

// =============================================
// SERVICE INFORMATION
// =============================================

/**
 * @swagger
 * /api/v1/predictions/capabilities:
 *   get:
 *     summary: Get prediction engine capabilities
 *     tags: [Predictions - Service Info]
 *     responses:
 *       200:
 *         description: Capabilities retrieved
 */
router.get('/capabilities', predictionController.getCapabilities);

/**
 * @swagger
 * /api/v1/predictions/statistics:
 *   get:
 *     summary: Get prediction statistics
 *     tags: [Predictions - Service Info]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved
 */
router.get(
  '/statistics',
  auth,
  authorize(['admin']),
  predictionController.getStatistics
);

/**
 * @swagger
 * /api/v1/predictions/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Predictions - Service Info]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', (req, res) => {
  res.json({
    service: 'Prediction Engine Service',
    status: 'Active',
    version: '1.0.0',
    features: [
      'Student performance prediction',
      'Dropout risk analysis',
      'Career path recommendations',
      'Course recommendations',
      'Grade predictions',
      'Study pattern analysis'
    ],
    algorithms: {
      performance: ['Multi-linear regression', 'Trend analysis', 'Neural networks'],
      dropout: ['Risk scoring', 'Pattern recognition', 'Neural networks'],
      career: ['Profile matching', 'Collaborative filtering'],
      courses: ['Rule-based recommendation', 'Prerequisite analysis'],
      grades: ['Weighted average', 'Scenario modeling']
    },
    mlFrameworks: ['Brain.js', 'ML-Regression', 'TensorFlow.js', 'Simple Statistics'],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
