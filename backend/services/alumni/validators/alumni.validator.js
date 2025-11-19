const Joi = require('joi');

/**
 * Alumni Validators
 * Validation schemas for alumni profiles, events, donations, and mentorship
 */

// =============================================
// ALUMNI PROFILE SCHEMAS
// =============================================

const createProfileSchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  school_id: Joi.string().uuid().required(),
  graduation_year: Joi.number().integer().min(1900).max(2100).required(),
  current_occupation: Joi.string().max(255),
  current_employer: Joi.string().max(255),
  industry: Joi.string().max(100),
  job_title: Joi.string().max(255),
  linkedin_url: Joi.string().uri().max(500),
  current_city: Joi.string().max(100),
  current_country: Joi.string().max(100),
  email: Joi.string().email().max(255),
  phone: Joi.string().max(20),
  is_willing_to_mentor: Joi.boolean().default(false),
  is_willing_to_recruit: Joi.boolean().default(false),
  privacy_settings: Joi.object().default({})
});

const updateProfileSchema = Joi.object({
  graduation_year: Joi.number().integer().min(1900).max(2100),
  current_occupation: Joi.string().max(255),
  current_employer: Joi.string().max(255),
  industry: Joi.string().max(100),
  job_title: Joi.string().max(255),
  linkedin_url: Joi.string().uri().max(500).allow(''),
  current_city: Joi.string().max(100),
  current_country: Joi.string().max(100),
  email: Joi.string().email().max(255),
  phone: Joi.string().max(20),
  is_willing_to_mentor: Joi.boolean(),
  is_willing_to_recruit: Joi.boolean(),
  privacy_settings: Joi.object()
});

const listProfilesQuerySchema = Joi.object({
  school_id: Joi.string().uuid(),
  graduation_year: Joi.number().integer(),
  industry: Joi.string().max(100),
  is_willing_to_mentor: Joi.boolean(),
  is_willing_to_recruit: Joi.boolean(),
  search: Joi.string().max(255), // Search by name, employer, occupation
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// =============================================
// EVENT SCHEMAS
// =============================================

const createEventSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  event_name: Joi.string().max(255).required(),
  description: Joi.string().allow(''),
  event_type: Joi.string().valid(
    'reunion', 'networking', 'fundraising', 'career_fair', 'lecture', 'social'
  ),
  event_date: Joi.date().iso().required(),
  location: Joi.string().max(500),
  is_virtual: Joi.boolean().default(false),
  max_attendees: Joi.number().integer().min(1),
  registration_deadline: Joi.date().iso(),
  status: Joi.string().valid('planned', 'open', 'closed', 'completed', 'cancelled').default('planned')
});

const updateEventSchema = Joi.object({
  event_name: Joi.string().max(255),
  description: Joi.string().allow(''),
  event_type: Joi.string().valid(
    'reunion', 'networking', 'fundraising', 'career_fair', 'lecture', 'social'
  ),
  event_date: Joi.date().iso(),
  location: Joi.string().max(500),
  is_virtual: Joi.boolean(),
  max_attendees: Joi.number().integer().min(1),
  registration_deadline: Joi.date().iso(),
  status: Joi.string().valid('planned', 'open', 'closed', 'completed', 'cancelled')
});

const listEventsQuerySchema = Joi.object({
  school_id: Joi.string().uuid(),
  event_type: Joi.string().valid(
    'reunion', 'networking', 'fundraising', 'career_fair', 'lecture', 'social'
  ),
  status: Joi.string().valid('planned', 'open', 'closed', 'completed', 'cancelled'),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// =============================================
// REGISTRATION SCHEMAS
// =============================================

const createRegistrationSchema = Joi.object({
  event_id: Joi.string().uuid().required(),
  alumni_id: Joi.string().uuid().required(),
  plus_one: Joi.number().integer().min(0).max(5).default(0),
  dietary_restrictions: Joi.string().allow(''),
  notes: Joi.string().allow('')
});

const updateRegistrationSchema = Joi.object({
  attendance_status: Joi.string().valid('registered', 'attended', 'no_show', 'cancelled'),
  plus_one: Joi.number().integer().min(0).max(5),
  dietary_restrictions: Joi.string().allow(''),
  notes: Joi.string().allow('')
});

// =============================================
// DONATION SCHEMAS
// =============================================

const createDonationSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  alumni_id: Joi.string().uuid(),
  donor_name: Joi.string().max(255).required(),
  donor_email: Joi.string().email().max(255),
  amount: Joi.number().min(0.01).required(),
  currency: Joi.string().length(3).default('USD'),
  donation_type: Joi.string().valid('one_time', 'recurring', 'pledge'),
  purpose: Joi.string().max(255),
  payment_method: Joi.string().max(50),
  payment_status: Joi.string().valid('pending', 'completed', 'failed', 'refunded', 'cancelled').default('pending'),
  transaction_id: Joi.string().max(255),
  is_anonymous: Joi.boolean().default(false),
  donation_date: Joi.date().iso()
});

const updateDonationSchema = Joi.object({
  payment_status: Joi.string().valid('pending', 'completed', 'failed', 'refunded', 'cancelled'),
  transaction_id: Joi.string().max(255),
  tax_receipt_sent: Joi.boolean()
});

const listDonationsQuerySchema = Joi.object({
  school_id: Joi.string().uuid(),
  alumni_id: Joi.string().uuid(),
  donation_type: Joi.string().valid('one_time', 'recurring', 'pledge'),
  payment_status: Joi.string().valid('pending', 'completed', 'failed', 'refunded', 'cancelled'),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// =============================================
// MENTORSHIP SCHEMAS
// =============================================

const createProgramSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  program_name: Joi.string().max(255).required(),
  description: Joi.string().allow(''),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  status: Joi.string().valid('active', 'completed', 'cancelled').default('active')
});

const updateProgramSchema = Joi.object({
  program_name: Joi.string().max(255),
  description: Joi.string().allow(''),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  status: Joi.string().valid('active', 'completed', 'cancelled')
});

const createMatchSchema = Joi.object({
  program_id: Joi.string().uuid().required(),
  mentor_id: Joi.string().uuid().required(), // alumni_id
  mentee_id: Joi.string().uuid().required(), // student_id
  status: Joi.string().valid('active', 'completed', 'on_hold', 'terminated').default('active')
});

const updateMatchSchema = Joi.object({
  status: Joi.string().valid('active', 'completed', 'on_hold', 'terminated'),
  feedback: Joi.string().allow('')
});

module.exports = {
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
};
