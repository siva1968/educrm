const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');

// Health check
router.get('/health', (req, res) => {
  res.json({
    service: 'Student Information Service',
    status: 'Active',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Student CRUD operations
router.post('/students', studentController.createStudent);
router.get('/students', studentController.getAllStudents);
router.get('/students/search', studentController.searchStudents);
router.get('/students/:id', studentController.getStudentById);
router.put('/students/:id', studentController.updateStudent);
router.delete('/students/:id', studentController.deleteStudent);
router.post('/students/bulk', studentController.bulkImportStudents);

// Enrollment operations
router.post('/enrollment', studentController.enrollStudent);
router.get('/enrollment/student/:id', studentController.getEnrollmentByStudent);
router.post('/enrollment/transfer', studentController.transferStudent);
router.post('/enrollment/withdraw', studentController.withdrawStudent);

// Document operations
router.post('/documents', studentController.uploadDocument);
router.get('/documents/student/:id', studentController.getDocumentsByStudent);
router.get('/documents/:id', studentController.downloadDocument);

// Guardian operations
router.post('/guardians', studentController.addGuardian);
router.get('/guardians/student/:id', studentController.getGuardiansByStudent);
router.put('/guardians/:id', studentController.updateGuardian);

// Statistics
router.get('/stats/overview', studentController.getStudentStatistics);
router.get('/stats/demographics', studentController.getDemographics);

module.exports = router;
