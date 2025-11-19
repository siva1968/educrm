const alumniService = require('../services/alumni.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  createProfileSchema,
  updateProfileSchema,
  listProfilesQuerySchema,
  createEventSchema,
  updateEventSchema,
  listEventsQuerySchema,
  createRegistrationSchema,
  updateRegistrationSchema,
  createDonationSchema,
  updateDonationSchema,
  listDonationsQuerySchema,
  createProgramSchema,
  updateProgramSchema,
  createMatchSchema,
  updateMatchSchema
} = require('../validators/alumni.validator');

/**
 * Alumni Controller
 * Handles HTTP requests for alumni operations
 */

class AlumniController {
  // === PROFILES ===
  async createProfile(req, res, next) {
    try {
      const { error, value } = createProfileSchema.validate(req.body);
      if (error) return ApiResponse.validationError(res, error.details);
      const profile = await alumniService.createProfile(value);
      return ApiResponse.success(res, profile, 'Profile created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const profile = await alumniService.getProfile(req.params.id);
      return ApiResponse.success(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async listProfiles(req, res, next) {
    try {
      const { error, value } = listProfilesQuerySchema.validate(req.query);
      if (error) return ApiResponse.validationError(res, error.details);
      const result = await alumniService.listProfiles(value);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { error, value } = updateProfileSchema.validate(req.body);
      if (error) return ApiResponse.validationError(res, error.details);
      const profile = await alumniService.updateProfile(req.params.id, value);
      return ApiResponse.success(res, profile, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteProfile(req, res, next) {
    try {
      const result = await alumniService.deleteProfile(req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // === EVENTS ===
  async createEvent(req, res, next) {
    try {
      const { error, value } = createEventSchema.validate(req.body);
      if (error) return ApiResponse.validationError(res, error.details);
      const userId = req.user.userId;
      const event = await alumniService.createEvent(value, userId);
      return ApiResponse.success(res, event, 'Event created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getEvent(req, res, next) {
    try {
      const event = await alumniService.getEvent(req.params.id);
      return ApiResponse.success(res, event);
    } catch (error) {
      next(error);
    }
  }

  async listEvents(req, res, next) {
    try {
      const { error, value } = listEventsQuerySchema.validate(req.query);
      if (error) return ApiResponse.validationError(res, error.details);
      const result = await alumniService.listEvents(value);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateEvent(req, res, next) {
    try {
      const { error, value } = updateEventSchema.validate(req.body);
      if (error) return ApiResponse.validationError(res, error.details);
      const event = await alumniService.updateEvent(req.params.id, value);
      return ApiResponse.success(res, event, 'Event updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteEvent(req, res, next) {
    try {
      const result = await alumniService.deleteEvent(req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // === REGISTRATIONS ===
  async registerForEvent(req, res, next) {
    try {
      const { error, value } = createRegistrationSchema.validate(req.body);
      if (error) return ApiResponse.validationError(res, error.details);
      const registration = await alumniService.registerForEvent(value);
      return ApiResponse.success(res, registration, 'Registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getEventRegistrations(req, res, next) {
    try {
      const registrations = await alumniService.getEventRegistrations(req.params.id);
      return ApiResponse.success(res, registrations);
    } catch (error) {
      next(error);
    }
  }

  async updateRegistration(req, res, next) {
    try {
      const { error, value } = updateRegistrationSchema.validate(req.body);
      if (error) return ApiResponse.validationError(res, error.details);
      const registration = await alumniService.updateRegistration(req.params.id, value);
      return ApiResponse.success(res, registration, 'Registration updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // === DONATIONS ===
  async createDonation(req, res, next) {
    try {
      const { error, value } = createDonationSchema.validate(req.body);
      if (error) return ApiResponse.validationError(res, error.details);
      const donation = await alumniService.createDonation(value);
      return ApiResponse.success(res, donation, 'Donation recorded successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getDonation(req, res, next) {
    try {
      const donation = await alumniService.getDonation(req.params.id);
      return ApiResponse.success(res, donation);
    } catch (error) {
      next(error);
    }
  }

  async listDonations(req, res, next) {
    try {
      const { error, value } = listDonationsQuerySchema.validate(req.query);
      if (error) return ApiResponse.validationError(res, error.details);
      const result = await alumniService.listDonations(value);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateDonation(req, res, next) {
    try {
      const { error, value } = updateDonationSchema.validate(req.body);
      if (error) return ApiResponse.validationError(res, error.details);
      const donation = await alumniService.updateDonation(req.params.id, value);
      return ApiResponse.success(res, donation, 'Donation updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // === MENTORSHIP ===
  async createProgram(req, res, next) {
    try {
      const { error, value } = createProgramSchema.validate(req.body);
      if (error) return ApiResponse.validationError(res, error.details);
      const program = await alumniService.createProgram(value);
      return ApiResponse.success(res, program, 'Program created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getPrograms(req, res, next) {
    try {
      const { school_id } = req.query;
      if (!school_id) return ApiResponse.error(res, 'school_id is required', 400);
      const programs = await alumniService.getPrograms(school_id);
      return ApiResponse.success(res, programs);
    } catch (error) {
      next(error);
    }
  }

  async updateProgram(req, res, next) {
    try {
      const { error, value } = updateProgramSchema.validate(req.body);
      if (error) return ApiResponse.validationError(res, error.details);
      const program = await alumniService.updateProgram(req.params.id, value);
      return ApiResponse.success(res, program, 'Program updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async createMatch(req, res, next) {
    try {
      const { error, value } = createMatchSchema.validate(req.body);
      if (error) return ApiResponse.validationError(res, error.details);
      const match = await alumniService.createMatch(value);
      return ApiResponse.success(res, match, 'Match created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getProgramMatches(req, res, next) {
    try {
      const matches = await alumniService.getProgramMatches(req.params.id);
      return ApiResponse.success(res, matches);
    } catch (error) {
      next(error);
    }
  }

  async updateMatch(req, res, next) {
    try {
      const { error, value } = updateMatchSchema.validate(req.body);
      if (error) return ApiResponse.validationError(res, error.details);
      const match = await alumniService.updateMatch(req.params.id, value);
      return ApiResponse.success(res, match, 'Match updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AlumniController();
