const express = require('express');
const router = express.Router();
const { authenticate, authorize, enforceSchoolIsolation } = require('../../../shared/middleware/auth');
const alumniController = require('../controllers/alumni.controller');

/**
 * Alumni Management Service Routes
 * Prefix: /api/v1/alumni
 */

// Health check
router.get('/health', (req, res) => {
  res.json({
    service: 'Alumni Management Service',
    status: 'Active',
    version: '1.0.0',
    features: ['Alumni profiles', 'Events', 'Donations', 'Mentorship programs']
  });
});

router.use(authenticate);
router.use(enforceSchoolIsolation('school_id'));

// === PROFILES ===
router.post('/profiles', authorize('admin'), alumniController.createProfile.bind(alumniController));
router.get('/profiles', alumniController.listProfiles.bind(alumniController));
router.get('/profiles/:id', alumniController.getProfile.bind(alumniController));
router.put('/profiles/:id', authorize('admin'), alumniController.updateProfile.bind(alumniController));
router.delete('/profiles/:id', authorize('admin'), alumniController.deleteProfile.bind(alumniController));

// === EVENTS ===
router.post('/events', authorize('admin'), alumniController.createEvent.bind(alumniController));
router.get('/events', alumniController.listEvents.bind(alumniController));
router.get('/events/:id', alumniController.getEvent.bind(alumniController));
router.put('/events/:id', authorize('admin'), alumniController.updateEvent.bind(alumniController));
router.delete('/events/:id', authorize('admin'), alumniController.deleteEvent.bind(alumniController));

// === REGISTRATIONS ===
router.post('/registrations', alumniController.registerForEvent.bind(alumniController));
router.get('/events/:id/registrations', alumniController.getEventRegistrations.bind(alumniController));
router.put('/registrations/:id', authorize('admin'), alumniController.updateRegistration.bind(alumniController));

// === DONATIONS ===
router.post('/donations', authorize('admin'), alumniController.createDonation.bind(alumniController));
router.get('/donations', authorize('admin'), alumniController.listDonations.bind(alumniController));
router.get('/donations/:id', authorize('admin'), alumniController.getDonation.bind(alumniController));
router.put('/donations/:id', authorize('admin'), alumniController.updateDonation.bind(alumniController));

// === MENTORSHIP ===
router.post('/mentorship/programs', authorize('admin'), alumniController.createProgram.bind(alumniController));
router.get('/mentorship/programs', alumniController.getPrograms.bind(alumniController));
router.put('/mentorship/programs/:id', authorize('admin'), alumniController.updateProgram.bind(alumniController));
router.post('/mentorship/matches', authorize('admin', 'teacher'), alumniController.createMatch.bind(alumniController));
router.get('/mentorship/programs/:id/matches', alumniController.getProgramMatches.bind(alumniController));
router.put('/mentorship/matches/:id', authorize('admin', 'teacher'), alumniController.updateMatch.bind(alumniController));

module.exports = router;
