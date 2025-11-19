const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');

/**
 * Assignment Management Routes
 * Prefix: /api/v1/assignments
 */

// Assignment CRUD
router.post('/', assignmentController.createAssignment.bind(assignmentController));
router.get('/', assignmentController.listAssignments.bind(assignmentController));
router.get('/:id', assignmentController.getAssignment.bind(assignmentController));
router.put('/:id', assignmentController.updateAssignment.bind(assignmentController));
router.delete('/:id', assignmentController.deleteAssignment.bind(assignmentController));

// Submission Management
router.post('/:id/submit', assignmentController.submitAssignment.bind(assignmentController));
router.get('/:id/submissions', assignmentController.getSubmissions.bind(assignmentController));
router.get('/submissions/:submissionId', assignmentController.getSubmission.bind(assignmentController));
router.put('/submissions/:submissionId/grade', assignmentController.gradeSubmission.bind(assignmentController));

// Student Views
router.get('/my-assignments', assignmentController.getMyAssignments.bind(assignmentController));
router.get('/my-submissions', assignmentController.getMySubmissions.bind(assignmentController));

// Analytics
router.get('/:id/analytics', assignmentController.getAssignmentAnalytics.bind(assignmentController));

// Health check
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

module.exports = router;
