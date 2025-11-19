const express = require('express');
const router = express.Router();
const { authenticate, authorize, enforceSchoolIsolation } = require('../../../shared/middleware/auth');
const subjectController = require('../controllers/subject.controller');

/**
 * Subject Management Routes
 * Prefix: /api/v1/subjects
 */

// Health check (public - no auth required)
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

// Apply authentication and school isolation to all routes below
router.use(authenticate);
router.use(enforceSchoolIsolation('school_id'));

// Subject CRUD Operations (Admins only can create/update/delete)
router.post('/',
  authorize('admin'),
  subjectController.createSubject.bind(subjectController)
);
router.get('/', subjectController.listSubjects.bind(subjectController));
router.get('/:id', subjectController.getSubject.bind(subjectController));
router.put('/:id',
  authorize('admin'),
  subjectController.updateSubject.bind(subjectController)
);
router.delete('/:id',
  authorize('admin'),
  subjectController.deleteSubject.bind(subjectController)
);

// Syllabus Management (Admins and Teachers can manage)
router.post('/:id/syllabus',
  authorize('admin', 'teacher'),
  subjectController.addSyllabus.bind(subjectController)
);
router.get('/:id/syllabus', subjectController.getSyllabus.bind(subjectController));
router.put('/syllabus/:syllabusId',
  authorize('admin', 'teacher'),
  subjectController.updateSyllabus.bind(subjectController)
);

// Utility Endpoints (All authenticated users)
router.get('/by-class/:classLevel', subjectController.getSubjectsByClass.bind(subjectController));
router.get('/by-curriculum/:curriculum', subjectController.getSubjectsByCurriculum.bind(subjectController));

module.exports = router;
