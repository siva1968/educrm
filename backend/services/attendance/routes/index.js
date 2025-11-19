const express = require('express');
const attendanceController = require('../controllers/attendance.controller');

const router = express.Router();

// Attendance marking routes
router.post('/', attendanceController.markAttendance.bind(attendanceController));
router.post('/bulk', attendanceController.markBulkAttendance.bind(attendanceController));
router.get('/', attendanceController.getAttendance.bind(attendanceController));

// Student summary
router.get('/summary/:student_id', attendanceController.getStudentSummary.bind(attendanceController));

// Leave management
router.post('/leave', attendanceController.applyLeave.bind(attendanceController));
router.put('/leave/:leave_id', attendanceController.updateLeaveStatus.bind(attendanceController));

// Reports
router.get('/report/class', attendanceController.getClassReport.bind(attendanceController));
router.get('/report/low-attendance', attendanceController.getLowAttendance.bind(attendanceController));

// Policy management
router.post('/policy', attendanceController.upsertPolicy.bind(attendanceController));

module.exports = router;
