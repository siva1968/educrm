const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subject.controller');

/**
 * Subject Management Routes
 * Prefix: /api/v1/subjects
 */

// Subject CRUD Operations
router.post('/', subjectController.createSubject.bind(subjectController));
router.get('/', subjectController.listSubjects.bind(subjectController));
router.get('/:id', subjectController.getSubject.bind(subjectController));
router.put('/:id', subjectController.updateSubject.bind(subjectController));
router.delete('/:id', subjectController.deleteSubject.bind(subjectController));

// Syllabus Management
router.post('/:id/syllabus', subjectController.addSyllabus.bind(subjectController));
router.get('/:id/syllabus', subjectController.getSyllabus.bind(subjectController));
router.put('/syllabus/:syllabusId', subjectController.updateSyllabus.bind(subjectController));

// Utility Endpoints
router.get('/by-class/:classLevel', subjectController.getSubjectsByClass.bind(subjectController));
router.get('/by-curriculum/:curriculum', subjectController.getSubjectsByCurriculum.bind(subjectController));

// Health check
router.get('/health', (req, res) => {
  res.json({
    service: 'Subject Management Service',
    status: 'Active',
    version: '1.0.0',
    features: [
      'Subject CRUD operations',
      'Multi-curriculum support (CBSE, ICSE, Cambridge, IB)',
      'Syllabus management',
      'Class-wise subject filtering',
      'Curriculum-wise subject filtering'
    ]
  });
});

module.exports = router;
