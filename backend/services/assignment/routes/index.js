const express = require('express');
const router = express.Router();
const { authenticate, authorize, enforceSchoolIsolation } = require('../../../shared/middleware/auth');
const assignmentController = require('../controllers/assignment.controller');

/**
 * Assignment Management Routes
 * Prefix: /api/v1/assignments
 */

// Health check (public - no auth required)
router.get('/health', (req, res) => {
  res.json({
    service: 'Assignment Management Service',
    status: 'Active',
    version: '1.0.0',
    features: [
      'Assignment creation and distribution',
      'Multi-type assignment support',
      'File attachment handling',
      'Submission tracking with late detection',
      'Late penalty calculation',
      'Grading with feedback',
      'Student assignment dashboard',
      'Assignment analytics'
    ]
  });
});

// Apply authentication and school isolation to all routes below
router.use(authenticate);
router.use(enforceSchoolIsolation('school_id'));

// Assignment CRUD (Teachers and Admins can create/update, only Admins can delete)
router.post('/',
  authorize('admin', 'teacher'),
  assignmentController.createAssignment.bind(assignmentController)
);
router.get('/', assignmentController.listAssignments.bind(assignmentController));
router.get('/:id', assignmentController.getAssignment.bind(assignmentController));
router.put('/:id',
  authorize('admin', 'teacher'),
  assignmentController.updateAssignment.bind(assignmentController)
);
router.delete('/:id',
  authorize('admin'),
  assignmentController.deleteAssignment.bind(assignmentController)
);

// Submission Management (Students can submit, Teachers can grade)
router.post('/:id/submit',
  authorize('student', 'teacher'),
  assignmentController.submitAssignment.bind(assignmentController)
);
router.get('/:id/submissions',
  authorize('admin', 'teacher'),
  assignmentController.getSubmissions.bind(assignmentController)
);
router.get('/submissions/:submissionId',
  assignmentController.getSubmission.bind(assignmentController)
);
router.put('/submissions/:submissionId/grade',
  authorize('admin', 'teacher'),
  assignmentController.gradeSubmission.bind(assignmentController)
);

// Student Views (Students, Teachers, Admins can view their own data)
router.get('/my-assignments', assignmentController.getMyAssignments.bind(assignmentController));
router.get('/my-submissions', assignmentController.getMySubmissions.bind(assignmentController));

// Analytics (Teachers and Admins only)
router.get('/:id/analytics',
  authorize('admin', 'teacher'),
  assignmentController.getAssignmentAnalytics.bind(assignmentController)
);

module.exports = router;
