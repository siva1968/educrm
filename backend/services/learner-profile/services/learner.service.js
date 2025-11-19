const { query, transaction } = require('../../../shared/config/database');
const { v4: uuidv4 } = require('uuid');
const { NotFoundError } = require('../../../shared/utils/errors');
const logger = require('../../../shared/utils/logger');

class LearnerProfileService {
  /**
   * Create or update learner profile
   */
  async upsertLearnerProfile(profileData, userId) {
    try {
      const profileId = uuidv4();

      const result = await query(
        `INSERT INTO learner_profile.learner_profiles (
          profile_id, student_id, school_id, learning_style, learning_pace,
          preferred_subjects, discipline_score, cooperation_level, attention_span,
          participation_level, strength_areas, weakness_areas, recommended_interventions,
          staff_observations, parent_notes, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        )
        ON CONFLICT (student_id)
        DO UPDATE SET
          learning_style = EXCLUDED.learning_style,
          learning_pace = EXCLUDED.learning_pace,
          preferred_subjects = EXCLUDED.preferred_subjects,
          discipline_score = EXCLUDED.discipline_score,
          cooperation_level = EXCLUDED.cooperation_level,
          attention_span = EXCLUDED.attention_span,
          participation_level = EXCLUDED.participation_level,
          strength_areas = EXCLUDED.strength_areas,
          weakness_areas = EXCLUDED.weakness_areas,
          recommended_interventions = EXCLUDED.recommended_interventions,
          staff_observations = EXCLUDED.staff_observations,
          parent_notes = EXCLUDED.parent_notes,
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [
          profileId,
          profileData.student_id,
          profileData.school_id,
          profileData.learning_style || null,
          profileData.learning_pace || null,
          JSON.stringify(profileData.preferred_subjects || []),
          profileData.discipline_score || 50,
          profileData.cooperation_level || null,
          profileData.attention_span || null,
          profileData.participation_level || null,
          JSON.stringify(profileData.strength_areas || []),
          JSON.stringify(profileData.weakness_areas || []),
          JSON.stringify(profileData.recommended_interventions || []),
          profileData.staff_observations || null,
          profileData.parent_notes || null,
          userId
        ]
      );

      logger.info(`Learner profile updated for student: ${profileData.student_id}`);
      return this.formatProfile(result.rows[0]);
    } catch (error) {
      logger.error(`Error updating learner profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get learner profile by student ID
   */
  async getLearnerProfile(studentId) {
    const result = await query(
      `SELECT lp.*, s.first_name, s.last_name, s.class, s.roll_no
       FROM learner_profile.learner_profiles lp
       JOIN sis_core.students s ON lp.student_id = s.student_id
       WHERE lp.student_id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatProfile(result.rows[0]);
  }

  /**
   * Record behavioral incident
   */
  async recordIncident(incidentData, userId) {
    try {
      const incidentId = uuidv4();

      const result = await query(
        `INSERT INTO learner_profile.behavioral_incidents (
          incident_id, student_id, school_id, incident_date, incident_time,
          incident_type, description, severity_level, incident_location,
          reported_by_staff_id, reported_by_name, witness_names,
          other_students_involved, action_taken, action_type,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING *`,
        [
          incidentId,
          incidentData.student_id,
          incidentData.school_id,
          incidentData.incident_date,
          incidentData.incident_time || null,
          incidentData.incident_type,
          incidentData.description,
          incidentData.severity_level,
          incidentData.incident_location || null,
          incidentData.reported_by_staff_id || null,
          incidentData.reported_by_name || null,
          incidentData.witness_names || null,
          JSON.stringify(incidentData.other_students_involved || []),
          incidentData.action_taken || null,
          incidentData.action_type || null,
          userId
        ]
      );

      // Update discipline score based on severity
      await this.updateDisciplineScore(incidentData.student_id, incidentData.severity_level);

      logger.info(`Behavioral incident recorded: ${incidentId}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error recording incident: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update discipline score based on incident severity
   */
  async updateDisciplineScore(studentId, severity) {
    const scoreDeduction = {
      'Low': 5,
      'Medium': 10,
      'High': 15,
      'Critical': 20
    };

    await query(
      `UPDATE learner_profile.learner_profiles
       SET discipline_score = GREATEST(0, discipline_score - $1),
           updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $2`,
      [scoreDeduction[severity] || 0, studentId]
    );
  }

  /**
   * Get behavioral incidents for a student
   */
  async getIncidents(studentId, limit = 50) {
    const result = await query(
      `SELECT * FROM learner_profile.behavioral_incidents
       WHERE student_id = $1
       ORDER BY incident_date DESC, incident_time DESC
       LIMIT $2`,
      [studentId, limit]
    );

    return result.rows;
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(incidentId, updates, userId) {
    const allowedFields = [
      'parent_informed', 'parent_informed_date', 'parent_response',
      'counselor_referral', 'counselor_notes', 'follow_up_required',
      'follow_up_date', 'follow_up_notes', 'resolution_status', 'resolution_notes'
    ];

    const updateFields = [];
    const updateValues = [];
    let paramCounter = 1;

    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = $${paramCounter}`);
        updateValues.push(updates[field]);
        paramCounter++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateValues.push(incidentId);

    const result = await query(
      `UPDATE learner_profile.behavioral_incidents
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE incident_id = $${paramCounter}
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Incident not found');
    }

    return result.rows[0];
  }

  /**
   * Record positive recognition
   */
  async recordRecognition(recognitionData, userId) {
    try {
      const recognitionId = uuidv4();

      const result = await query(
        `INSERT INTO learner_profile.positive_recognitions (
          recognition_id, student_id, school_id, recognition_date,
          recognition_type, description, achievement_category,
          awarded_by_staff_id, awarded_by_name, points_awarded,
          announced_in_assembly, published_on_wall, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING *`,
        [
          recognitionId,
          recognitionData.student_id,
          recognitionData.school_id,
          recognitionData.recognition_date,
          recognitionData.recognition_type,
          recognitionData.description,
          recognitionData.achievement_category || null,
          recognitionData.awarded_by_staff_id || null,
          recognitionData.awarded_by_name || null,
          recognitionData.points_awarded || 0,
          recognitionData.announced_in_assembly || false,
          recognitionData.published_on_wall || false,
          userId
        ]
      );

      // Increase discipline score for positive recognition
      await query(
        `UPDATE learner_profile.learner_profiles
         SET discipline_score = LEAST(100, discipline_score + 5)
         WHERE student_id = $1`,
        [recognitionData.student_id]
      );

      logger.info(`Positive recognition recorded: ${recognitionId}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error recording recognition: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recognitions for a student
   */
  async getRecognitions(studentId, limit = 50) {
    const result = await query(
      `SELECT * FROM learner_profile.positive_recognitions
       WHERE student_id = $1
       ORDER BY recognition_date DESC
       LIMIT $2`,
      [studentId, limit]
    );

    return result.rows;
  }

  /**
   * Add staff observation
   */
  async addObservation(observationData, userId) {
    try {
      const observationId = uuidv4();

      const result = await query(
        `INSERT INTO learner_profile.staff_observations (
          observation_id, student_id, school_id, observation_date,
          observed_by_staff_id, observed_by_name, observation_type,
          observation_text, subject, activity_context, tags,
          visible_to_parents
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        ) RETURNING *`,
        [
          observationId,
          observationData.student_id,
          observationData.school_id,
          observationData.observation_date,
          observationData.observed_by_staff_id || null,
          observationData.observed_by_name || null,
          observationData.observation_type,
          observationData.observation_text,
          observationData.subject || null,
          observationData.activity_context || null,
          JSON.stringify(observationData.tags || []),
          observationData.visible_to_parents || false
        ]
      );

      logger.info(`Staff observation added: ${observationId}`);
      return this.formatObservation(result.rows[0]);
    } catch (error) {
      logger.error(`Error adding observation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get staff observations
   */
  async getObservations(studentId, limit = 50) {
    const result = await query(
      `SELECT * FROM learner_profile.staff_observations
       WHERE student_id = $1
       ORDER BY observation_date DESC
       LIMIT $2`,
      [studentId, limit]
    );

    return result.rows.map(obs => this.formatObservation(obs));
  }

  /**
   * Record development milestone
   */
  async recordMilestone(milestoneData, userId) {
    try {
      const milestoneId = uuidv4();

      const result = await query(
        `INSERT INTO learner_profile.development_milestones (
          milestone_id, student_id, school_id, milestone_date,
          milestone_type, milestone_description, achievement_level,
          assessor_staff_id, assessor_name, evidence_documents,
          evidence_photos, curriculum_standard, skill_area, notes,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        ) RETURNING *`,
        [
          milestoneId,
          milestoneData.student_id,
          milestoneData.school_id,
          milestoneData.milestone_date,
          milestoneData.milestone_type,
          milestoneData.milestone_description,
          milestoneData.achievement_level || null,
          milestoneData.assessor_staff_id || null,
          milestoneData.assessor_name || null,
          JSON.stringify(milestoneData.evidence_documents || []),
          JSON.stringify(milestoneData.evidence_photos || []),
          milestoneData.curriculum_standard || null,
          milestoneData.skill_area || null,
          milestoneData.notes || null,
          userId
        ]
      );

      logger.info(`Development milestone recorded: ${milestoneId}`);
      return this.formatMilestone(result.rows[0]);
    } catch (error) {
      logger.error(`Error recording milestone: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get development milestones
   */
  async getMilestones(studentId, limit = 50) {
    const result = await query(
      `SELECT * FROM learner_profile.development_milestones
       WHERE student_id = $1
       ORDER BY milestone_date DESC
       LIMIT $2`,
      [studentId, limit]
    );

    return result.rows.map(m => this.formatMilestone(m));
  }

  /**
   * Get comprehensive student profile
   */
  async getComprehensiveProfile(studentId) {
    const profile = await this.getLearnerProfile(studentId);
    const incidents = await this.getIncidents(studentId, 10);
    const recognitions = await this.getRecognitions(studentId, 10);
    const observations = await this.getObservations(studentId, 10);
    const milestones = await this.getMilestones(studentId, 10);

    return {
      profile,
      recent_incidents: incidents,
      recent_recognitions: recognitions,
      recent_observations: observations,
      recent_milestones: milestones,
    };
  }

  /**
   * Format profile data
   */
  formatProfile(profile) {
    if (!profile) return null;

    // Parse JSON fields
    ['preferred_subjects', 'strength_areas', 'weakness_areas', 'recommended_interventions'].forEach(field => {
      if (typeof profile[field] === 'string') {
        try {
          profile[field] = JSON.parse(profile[field]);
        } catch (e) {
          profile[field] = [];
        }
      }
    });

    return profile;
  }

  /**
   * Format observation data
   */
  formatObservation(observation) {
    if (typeof observation.tags === 'string') {
      try {
        observation.tags = JSON.parse(observation.tags);
      } catch (e) {
        observation.tags = [];
      }
    }
    return observation;
  }

  /**
   * Format milestone data
   */
  formatMilestone(milestone) {
    ['evidence_documents', 'evidence_photos'].forEach(field => {
      if (typeof milestone[field] === 'string') {
        try {
          milestone[field] = JSON.parse(milestone[field]);
        } catch (e) {
          milestone[field] = [];
        }
      }
    });
    return milestone;
  }
}

module.exports = new LearnerProfileService();
