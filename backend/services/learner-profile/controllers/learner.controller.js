const learnerService = require('../services/learner.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  learnerProfileSchema,
  behavioralIncidentSchema,
  positiveRecognitionSchema,
  staffObservationSchema,
  developmentMilestoneSchema,
} = require('../validators/learner.validator');

class LearnerProfileController {
  /**
   * Create or update learner profile
   */
  async upsertProfile(req, res, next) {
    try {
      const { error, value } = learnerProfileSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const profile = await learnerService.upsertLearnerProfile(value, userId);

      return ApiResponse.success(res, profile, 'Learner profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get learner profile
   */
  async getProfile(req, res, next) {
    try {
      const { student_id } = req.params;
      const profile = await learnerService.getLearnerProfile(student_id);

      if (!profile) {
        return ApiResponse.notFound(res, 'Learner profile not found');
      }

      return ApiResponse.success(res, profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get comprehensive profile
   */
  async getComprehensiveProfile(req, res, next) {
    try {
      const { student_id } = req.params;
      const profile = await learnerService.getComprehensiveProfile(student_id);

      return ApiResponse.success(res, profile, 'Comprehensive profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record behavioral incident
   */
  async recordIncident(req, res, next) {
    try {
      const { error, value } = behavioralIncidentSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const incident = await learnerService.recordIncident(value, userId);

      return ApiResponse.created(res, incident, 'Behavioral incident recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get incidents
   */
  async getIncidents(req, res, next) {
    try {
      const { student_id } = req.params;
      const { limit } = req.query;

      const incidents = await learnerService.getIncidents(student_id, limit ? parseInt(limit) : 50);

      return ApiResponse.success(res, incidents, `Retrieved ${incidents.length} incidents`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update incident
   */
  async updateIncident(req, res, next) {
    try {
      const { incident_id } = req.params;

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const incident = await learnerService.updateIncidentStatus(incident_id, req.body, userId);

      return ApiResponse.success(res, incident, 'Incident updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record positive recognition
   */
  async recordRecognition(req, res, next) {
    try {
      const { error, value } = positiveRecognitionSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const recognition = await learnerService.recordRecognition(value, userId);

      return ApiResponse.created(res, recognition, 'Positive recognition recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recognitions
   */
  async getRecognitions(req, res, next) {
    try {
      const { student_id } = req.params;
      const { limit } = req.query;

      const recognitions = await learnerService.getRecognitions(student_id, limit ? parseInt(limit) : 50);

      return ApiResponse.success(res, recognitions, `Retrieved ${recognitions.length} recognitions`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add staff observation
   */
  async addObservation(req, res, next) {
    try {
      const { error, value } = staffObservationSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const observation = await learnerService.addObservation(value, userId);

      return ApiResponse.created(res, observation, 'Staff observation added successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get observations
   */
  async getObservations(req, res, next) {
    try {
      const { student_id } = req.params;
      const { limit } = req.query;

      const observations = await learnerService.getObservations(student_id, limit ? parseInt(limit) : 50);

      return ApiResponse.success(res, observations, `Retrieved ${observations.length} observations`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record development milestone
   */
  async recordMilestone(req, res, next) {
    try {
      const { error, value } = developmentMilestoneSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const milestone = await learnerService.recordMilestone(value, userId);

      return ApiResponse.created(res, milestone, 'Development milestone recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get milestones
   */
  async getMilestones(req, res, next) {
    try {
      const { student_id } = req.params;
      const { limit } = req.query;

      const milestones = await learnerService.getMilestones(student_id, limit ? parseInt(limit) : 50);

      return ApiResponse.success(res, milestones, `Retrieved ${milestones.length} milestones`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LearnerProfileController();
