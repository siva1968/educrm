const express = require('express');
const router = express.Router();
const examinationController = require('../controllers/examination.controller');

/**
 * Examination Management Routes
 * Prefix: /api/v1/examinations
 */

// Examination CRUD
router.post('/', examinationController.createExamination.bind(examinationController));
router.get('/', examinationController.listExaminations.bind(examinationController));
router.get('/:id', examinationController.getExamination.bind(examinationController));
router.put('/:id', examinationController.updateExamination.bind(examinationController));

// Exam Schedule (Timetable)
router.post('/:id/schedule', examinationController.addExamSchedule.bind(examinationController));
router.get('/:id/schedule', examinationController.getExamSchedule.bind(examinationController));
router.put('/schedule/:scheduleId', examinationController.updateExamSchedule.bind(examinationController));

// Results Management
router.post('/results', examinationController.recordResult.bind(examinationController));
router.post('/results/batch', examinationController.recordBatchResults.bind(examinationController));
router.get('/:id/results', examinationController.getExaminationResults.bind(examinationController));
router.get('/results/student/:studentId', examinationController.getStudentResults.bind(examinationController));

// Analytics
router.get('/:id/analytics', examinationController.getExamAnalytics.bind(examinationController));
router.get('/:id/toppers', examinationController.getToppers.bind(examinationController));

// Health check
router.get('/health', (req, res) => {
  res.json({
    service: 'Examination Management Service',
    status: 'Active',
    version: '1.0.0',
    features: [
      'Examination scheduling and management',
      'Subject-wise exam timetable',
      'Result processing with auto-calculation',
      'Single and batch result recording',
      'Student result tracking',
      'Exam analytics and statistics',
      'Top performers identification'
    ]
  });
});

module.exports = router;
