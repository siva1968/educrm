const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetable.controller');

/**
 * Timetable Management Routes
 * Prefix: /api/v1/timetable
 */

// Configuration Management
router.post('/config', timetableController.createConfig.bind(timetableController));
router.get('/config', timetableController.getConfig.bind(timetableController));
router.put('/config/:id', timetableController.updateConfig.bind(timetableController));

// Timetable CRUD
router.post('/', timetableController.createTimetableEntry.bind(timetableController));
router.post('/batch', timetableController.batchCreateTimetable.bind(timetableController));
router.put('/:id', timetableController.updateTimetableEntry.bind(timetableController));

// View Timetables
router.get('/class/:class', timetableController.getClassTimetable.bind(timetableController));
router.get('/teacher/:teacherId', timetableController.getTeacherTimetable.bind(timetableController));

// Teacher Workload
router.get('/workload/teacher/:teacherId', timetableController.getTeacherWorkload.bind(timetableController));
router.get('/workload/summary', timetableController.getWorkloadSummary.bind(timetableController));

// Health check
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

module.exports = router;
