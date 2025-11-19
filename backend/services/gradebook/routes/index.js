const express = require('express');
const router = express.Router();
const { authenticate, authorize, enforceSchoolIsolation } = require('../../../shared/middleware/auth');
const gradebookController = require('../controllers/gradebook.controller');
const reportCardController = require('../controllers/reportcard.controller');

/**
 * Grade Book Routes
 * Prefix: /api/v1/gradebook
 */

// Health check (public - no auth required)
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
      'Student performance tracking',
      'Report card generation and management'
    ]
  });
});

// Apply authentication and school isolation to all routes below
router.use(authenticate);
router.use(enforceSchoolIsolation('school_id'));

// Assessment Management (Teachers and Admins only can create/update)
router.post('/assessments',
  authorize('admin', 'teacher'),
  gradebookController.createAssessment.bind(gradebookController)
);
router.get('/assessments', gradebookController.listAssessments.bind(gradebookController));
router.get('/assessments/:id', gradebookController.getAssessment.bind(gradebookController));
router.put('/assessments/:id',
  authorize('admin', 'teacher'),
  gradebookController.updateAssessment.bind(gradebookController)
);
router.get('/assessments/:id/statistics', gradebookController.getAssessmentStatistics.bind(gradebookController));

// Grade Management (Only teachers and admins can record/update grades)
router.post('/grades',
  authorize('admin', 'teacher'),
  gradebookController.recordGrade.bind(gradebookController)
);
router.post('/grades/batch',
  authorize('admin', 'teacher'),
  gradebookController.recordBatchGrades.bind(gradebookController)
);
router.get('/grades/student/:studentId', gradebookController.getStudentGrades.bind(gradebookController));
router.put('/grades/:gradeId',
  authorize('admin', 'teacher'),
  gradebookController.updateGrade.bind(gradebookController)
);

// Analytics (All authenticated users can view)
router.get('/analytics/class', gradebookController.getClassPerformance.bind(gradebookController));

// Report Card Management
router.post('/report-cards/generate',
  authorize('admin', 'teacher'),
  reportCardController.generateReportCard.bind(reportCardController)
);
router.post('/report-cards/bulk-generate',
  authorize('admin'),
  reportCardController.bulkGenerateReportCards.bind(reportCardController)
);
router.get('/report-cards', reportCardController.listReportCards.bind(reportCardController));
router.get('/report-cards/:id', reportCardController.getReportCard.bind(reportCardController));
router.put('/report-cards/:id',
  authorize('admin', 'teacher'),
  reportCardController.updateReportCard.bind(reportCardController)
);
router.post('/report-cards/:id/publish',
  authorize('admin', 'teacher'),
  reportCardController.publishReportCard.bind(reportCardController)
);
router.delete('/report-cards/:id',
  authorize('admin'),
  reportCardController.deleteReportCard.bind(reportCardController)
);

// Student-specific report cards (students can view their own)
router.get('/students/:studentId/report-cards',
  reportCardController.getStudentReportCards.bind(reportCardController)
);

module.exports = router;
