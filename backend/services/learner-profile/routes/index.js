const express = require('express');
const learnerController = require('../controllers/learner.controller');

const router = express.Router();

// Learner profile routes
router.post('/profile', learnerController.upsertProfile.bind(learnerController));
router.get('/profile/:student_id', learnerController.getProfile.bind(learnerController));
router.get('/profile/:student_id/comprehensive', learnerController.getComprehensiveProfile.bind(learnerController));

// Behavioral incidents
router.post('/incidents', learnerController.recordIncident.bind(learnerController));
router.get('/incidents/:student_id', learnerController.getIncidents.bind(learnerController));
router.put('/incidents/:incident_id', learnerController.updateIncident.bind(learnerController));

// Positive recognitions
router.post('/recognitions', learnerController.recordRecognition.bind(learnerController));
router.get('/recognitions/:student_id', learnerController.getRecognitions.bind(learnerController));

// Staff observations
router.post('/observations', learnerController.addObservation.bind(learnerController));
router.get('/observations/:student_id', learnerController.getObservations.bind(learnerController));

// Development milestones
router.post('/milestones', learnerController.recordMilestone.bind(learnerController));
router.get('/milestones/:student_id', learnerController.getMilestones.bind(learnerController));

module.exports = router;
