const Joi = require('joi');

const learnerProfileSchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  school_id: Joi.string().uuid().required(),
  learning_style: Joi.string().valid('Visual', 'Auditory', 'Kinesthetic', 'Reading/Writing', 'Mixed').optional(),
  learning_pace: Joi.string().valid('Fast Learner', 'Average', 'Slow Learner', 'Needs Support').optional(),
  preferred_subjects: Joi.array().items(Joi.string()).optional(),
  discipline_score: Joi.number().integer().min(0).max(100).default(50),
  cooperation_level: Joi.string().optional(),
  attention_span: Joi.string().optional(),
  participation_level: Joi.string().optional(),
  strength_areas: Joi.array().items(Joi.string()).optional(),
  weakness_areas: Joi.array().items(Joi.string()).optional(),
  recommended_interventions: Joi.array().items(Joi.string()).optional(),
  staff_observations: Joi.string().optional().allow('', null),
  parent_notes: Joi.string().optional().allow('', null),
});

const behavioralIncidentSchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  school_id: Joi.string().uuid().required(),
  incident_date: Joi.date().max('now').required(),
  incident_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).optional(),
  incident_type: Joi.string().valid(
    'Misconduct', 'Aggression', 'Bullying', 'Absenteeism',
    'Late Arrival', 'Dress Code Violation', 'Academic Dishonesty', 'Other'
  ).required(),
  description: Joi.string().required(),
  severity_level: Joi.string().valid('Low', 'Medium', 'High', 'Critical').required(),
  incident_location: Joi.string().max(255).optional(),
  reported_by_staff_id: Joi.string().uuid().optional(),
  reported_by_name: Joi.string().max(255).optional(),
  witness_names: Joi.string().optional().allow('', null),
  other_students_involved: Joi.array().items(Joi.string().uuid()).optional(),
  action_taken: Joi.string().optional().allow('', null),
  action_type: Joi.string().valid(
    'Verbal Warning', 'Written Warning', 'Detention', 'Suspension',
    'Parent Call', 'Counseling Referral', 'No Action', 'Other'
  ).optional(),
});

const positiveRecognitionSchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  school_id: Joi.string().uuid().required(),
  recognition_date: Joi.date().max('now').required(),
  recognition_type: Joi.string().valid(
    'Academic Excellence', 'Good Behavior', 'Sports Achievement',
    'Arts & Culture', 'Community Service', 'Leadership', 'Attendance', 'Other'
  ).required(),
  description: Joi.string().required(),
  achievement_category: Joi.string().valid(
    'Gold', 'Silver', 'Bronze', 'Certificate of Merit', 'Appreciation'
  ).optional(),
  awarded_by_staff_id: Joi.string().uuid().optional(),
  awarded_by_name: Joi.string().max(255).optional(),
  points_awarded: Joi.number().integer().min(0).default(0),
  announced_in_assembly: Joi.boolean().default(false),
  published_on_wall: Joi.boolean().default(false),
});

const staffObservationSchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  school_id: Joi.string().uuid().required(),
  observation_date: Joi.date().max('now').required(),
  observed_by_staff_id: Joi.string().uuid().optional(),
  observed_by_name: Joi.string().max(255).optional(),
  observation_type: Joi.string().valid(
    'Academic', 'Behavioral', 'Social', 'Emotional', 'Physical', 'General'
  ).required(),
  observation_text: Joi.string().required(),
  subject: Joi.string().max(100).optional(),
  activity_context: Joi.string().max(255).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  visible_to_parents: Joi.boolean().default(false),
});

const developmentMilestoneSchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  school_id: Joi.string().uuid().required(),
  milestone_date: Joi.date().max('now').required(),
  milestone_type: Joi.string().valid(
    'Cognitive', 'Motor Skills', 'Language', 'Social-Emotional', 'Creative', 'Academic'
  ).required(),
  milestone_description: Joi.string().required(),
  achievement_level: Joi.string().valid(
    'Emerging', 'Developing', 'Proficient', 'Advanced', 'Mastered'
  ).optional(),
  assessor_staff_id: Joi.string().uuid().optional(),
  assessor_name: Joi.string().max(255).optional(),
  evidence_documents: Joi.array().items(Joi.string().uri()).optional(),
  evidence_photos: Joi.array().items(Joi.string().uri()).optional(),
  curriculum_standard: Joi.string().max(255).optional(),
  skill_area: Joi.string().max(100).optional(),
  notes: Joi.string().optional().allow('', null),
});

module.exports = {
  learnerProfileSchema,
  behavioralIncidentSchema,
  positiveRecognitionSchema,
  staffObservationSchema,
  developmentMilestoneSchema,
};
