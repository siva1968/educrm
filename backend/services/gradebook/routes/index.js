const express = require('express');
const router = express.Router();
const gradebookController = require('../controllers/gradebook.controller');

/**
 * Grade Book Routes
 * Prefix: /api/v1/gradebook
 */

// Assessment Management
router.post('/assessments', gradebookController.createAssessment.bind(gradebookController));
router.get('/assessments', gradebookController.listAssessments.bind(gradebookController));
router.get('/assessments/:id', gradebookController.getAssessment.bind(gradebookController));
router.put('/assessments/:id', gradebookController.updateAssessment.bind(gradebookController));
router.get('/assessments/:id/statistics', gradebookController.getAssessmentStatistics.bind(gradebookController));

// Grade Management
router.post('/grades', gradebookController.recordGrade.bind(gradebookController));
router.post('/grades/batch', gradebookController.recordBatchGrades.bind(gradebookController));
router.get('/grades/student/:studentId', gradebookController.getStudentGrades.bind(gradebookController));
router.put('/grades/:gradeId', gradebookController.updateGrade.bind(gradebookController));

// Analytics
router.get('/analytics/class', gradebookController.getClassPerformance.bind(gradebookController));

// Health check
router.get('/health', (req, res) => {
  res.json({
    service: 'Grade Book Service',
    status: 'Active',
    version: '1.0.0',
    features: [
      'Assessment creation and management',
      'Multi-scale grading (CBSE, ICSE, Cambridge, IB, Percentage)',
      'Single and batch grade recording',
      'Automated grade calculation',
      'Class performance analytics',
      'Student performance tracking'
    ]
  });
});

module.exports = router;
