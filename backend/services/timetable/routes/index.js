const express = require('express');
const router = express.Router();
const { authenticate, authorize, enforceSchoolIsolation } = require('../../../shared/middleware/auth');
const timetableController = require('../controllers/timetable.controller');

/**
 * Timetable Management Routes
 * Prefix: /api/v1/timetable
 */

// Health check (public - no auth required)
router.get('/health', (req, res) => {
  res.json({
    service: 'Timetable Management Service',
    status: 'Active',
    version: '1.0.0',
    features: [
      'Timetable configuration management',
      'Class and teacher timetable scheduling',
      'Conflict detection (teacher, room)',
      'Batch timetable operations',
      'Teacher workload tracking',
      'Period-wise scheduling',
      'Flexible break and lunch periods'
    ]
  });
});

// Apply authentication and school isolation to all routes below
router.use(authenticate);
router.use(enforceSchoolIsolation('school_id'));

// Configuration Management (Admins only)
router.post('/config',
  authorize('admin'),
  timetableController.createConfig.bind(timetableController)
);
router.get('/config', timetableController.getConfig.bind(timetableController));
router.put('/config/:id',
  authorize('admin'),
  timetableController.updateConfig.bind(timetableController)
);

// Timetable CRUD (Admins only can create/update)
router.post('/',
  authorize('admin'),
  timetableController.createTimetableEntry.bind(timetableController)
);
router.post('/batch',
  authorize('admin'),
  timetableController.batchCreateTimetable.bind(timetableController)
);
router.put('/:id',
  authorize('admin'),
  timetableController.updateTimetableEntry.bind(timetableController)
);

// View Timetables (All authenticated users can view)
router.get('/class/:class', timetableController.getClassTimetable.bind(timetableController));
router.get('/teacher/:teacherId', timetableController.getTeacherTimetable.bind(timetableController));

// Teacher Workload (Teachers can view their own, Admins can view all)
router.get('/workload/teacher/:teacherId', timetableController.getTeacherWorkload.bind(timetableController));
router.get('/workload/summary',
  authorize('admin'),
  timetableController.getWorkloadSummary.bind(timetableController)
);

module.exports = router;
