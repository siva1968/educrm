const express = require('express');
const router = express.Router();
const { authenticate, authorize, enforceSchoolIsolation } = require('../../../shared/middleware/auth');
const examinationController = require('../controllers/examination.controller');

/**
 * Examination Management Routes
 * Prefix: /api/v1/examinations
 */

// Health check (public - no auth required)
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

// Apply authentication and school isolation to all routes below
router.use(authenticate);
router.use(enforceSchoolIsolation('school_id'));

// Examination CRUD (Admins only can create/update)
router.post('/',
  authorize('admin'),
  examinationController.createExamination.bind(examinationController)
);
router.get('/', examinationController.listExaminations.bind(examinationController));
router.get('/:id', examinationController.getExamination.bind(examinationController));
router.put('/:id',
  authorize('admin'),
  examinationController.updateExamination.bind(examinationController)
);

// Exam Schedule (Timetable) - Admins only
router.post('/:id/schedule',
  authorize('admin'),
  examinationController.addExamSchedule.bind(examinationController)
);
router.get('/:id/schedule', examinationController.getExamSchedule.bind(examinationController));
router.put('/schedule/:scheduleId',
  authorize('admin'),
  examinationController.updateExamSchedule.bind(examinationController)
);

// Results Management (Teachers and Admins can record)
router.post('/results',
  authorize('admin', 'teacher'),
  examinationController.recordResult.bind(examinationController)
);
router.post('/results/batch',
  authorize('admin', 'teacher'),
  examinationController.recordBatchResults.bind(examinationController)
);
router.get('/:id/results', examinationController.getExaminationResults.bind(examinationController));
router.get('/results/student/:studentId', examinationController.getStudentResults.bind(examinationController));

// Analytics (All authenticated users can view)
router.get('/:id/analytics', examinationController.getExamAnalytics.bind(examinationController));
router.get('/:id/toppers', examinationController.getToppers.bind(examinationController));

module.exports = router;
