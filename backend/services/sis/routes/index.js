const express = require('express');
const studentController = require('../controllers/student.controller');

const router = express.Router();

// Student routes
router.post('/', studentController.createStudent.bind(studentController));
router.get('/', studentController.listStudents.bind(studentController));
router.get('/statistics', studentController.getStatistics.bind(studentController));
router.get('/:id', studentController.getStudent.bind(studentController));
router.put('/:id', studentController.updateStudent.bind(studentController));
router.delete('/:id', studentController.deleteStudent.bind(studentController));

// Guardian routes
router.post('/:id/guardians', studentController.addGuardian.bind(studentController));

// Medical record routes
router.put('/:id/medical', studentController.updateMedicalRecord.bind(studentController));

module.exports = router;
