const Joi = require('joi');

const studentSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  roll_no: Joi.string().max(50).optional(),
  first_name: Joi.string().max(100).required(),
  middle_name: Joi.string().max(100).optional().allow('', null),
  last_name: Joi.string().max(100).required(),
  date_of_birth: Joi.date().max('now').required(),
  gender: Joi.string().valid('M', 'F', 'Male', 'Female', 'Other', 'Not Specified').optional(),

  email: Joi.string().email().max(255).optional().allow('', null),
  phone_primary: Joi.string().max(20).optional().allow('', null),
  phone_secondary: Joi.string().max(20).optional().allow('', null),

  class: Joi.string().max(10).required(),
  section: Joi.string().max(5).optional().allow('', null),
  curriculum: Joi.string().max(50).required(),
  board_code: Joi.string().max(20).optional().allow('', null),

  admission_date: Joi.date().required(),
  admission_number: Joi.string().max(50).optional(),
  previous_school: Joi.string().max(255).optional().allow('', null),
  previous_class: Joi.string().max(10).optional().allow('', null),

  address_current: Joi.string().optional().allow('', null),
  city_current: Joi.string().max(100).optional().allow('', null),
  state_current: Joi.string().max(100).optional().allow('', null),
  pincode_current: Joi.string().max(10).optional().allow('', null),

  address_permanent: Joi.string().optional().allow('', null),
  city_permanent: Joi.string().max(100).optional().allow('', null),
  state_permanent: Joi.string().max(100).optional().allow('', null),
  pincode_permanent: Joi.string().max(10).optional().allow('', null),

  aadhar_number: Joi.string().max(20).optional().allow('', null),
  pan_number: Joi.string().max(20).optional().allow('', null),
  birth_certificate_number: Joi.string().max(50).optional().allow('', null),

  metadata: Joi.object().optional(),
});

const studentUpdateSchema = Joi.object({
  roll_no: Joi.string().max(50).optional(),
  first_name: Joi.string().max(100).optional(),
  middle_name: Joi.string().max(100).optional().allow('', null),
  last_name: Joi.string().max(100).optional(),
  date_of_birth: Joi.date().max('now').optional(),
  gender: Joi.string().valid('M', 'F', 'Male', 'Female', 'Other', 'Not Specified').optional(),

  email: Joi.string().email().max(255).optional().allow('', null),
  phone_primary: Joi.string().max(20).optional().allow('', null),
  phone_secondary: Joi.string().max(20).optional().allow('', null),

  class: Joi.string().max(10).optional(),
  section: Joi.string().max(5).optional().allow('', null),
  curriculum: Joi.string().max(50).optional(),

  address_current: Joi.string().optional().allow('', null),
  city_current: Joi.string().max(100).optional().allow('', null),
  state_current: Joi.string().max(100).optional().allow('', null),
  pincode_current: Joi.string().max(10).optional().allow('', null),

  status: Joi.string().valid('Active', 'Inactive', 'Graduated', 'Transferred', 'Suspended').optional(),

  metadata: Joi.object().optional(),
}).min(1);

const guardianSchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  guardian_type: Joi.string().valid('Father', 'Mother', 'Legal Guardian', 'Grandparent', 'Other').required(),
  title: Joi.string().max(10).optional().allow('', null),
  first_name: Joi.string().max(100).required(),
  last_name: Joi.string().max(100).required(),

  email: Joi.string().email().max(255).optional().allow('', null),
  phone_primary: Joi.string().max(20).required(),
  phone_secondary: Joi.string().max(20).optional().allow('', null),

  occupation: Joi.string().max(100).optional().allow('', null),
  organization: Joi.string().max(255).optional().allow('', null),
  annual_income: Joi.string().max(50).optional().allow('', null),

  address: Joi.string().optional().allow('', null),
  city: Joi.string().max(100).optional().allow('', null),
  state: Joi.string().max(100).optional().allow('', null),
  pincode: Joi.string().max(10).optional().allow('', null),

  relation_to_student: Joi.string().max(50).optional().allow('', null),
  is_primary_contact: Joi.boolean().optional(),
  is_legal_guardian: Joi.boolean().optional(),
  can_pickup_student: Joi.boolean().optional(),
});

const medicalRecordSchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  blood_group: Joi.string().valid('O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-', 'Unknown').optional().allow('', null),
  height_cm: Joi.number().positive().max(300).optional().allow(null),
  weight_kg: Joi.number().positive().max(500).optional().allow(null),

  existing_conditions: Joi.string().optional().allow('', null),
  allergies: Joi.string().optional().allow('', null),
  dietary_restrictions: Joi.string().optional().allow('', null),
  special_needs: Joi.string().optional().allow('', null),

  covid_vaccinated: Joi.boolean().optional(),
  covid_vaccination_dates: Joi.array().items(Joi.date()).optional(),
  polio_vaccinated: Joi.boolean().optional(),
  other_vaccinations: Joi.array().optional(),

  emergency_contact_name: Joi.string().max(255).optional().allow('', null),
  emergency_contact_phone: Joi.string().max(20).optional().allow('', null),
  emergency_contact_relation: Joi.string().max(50).optional().allow('', null),
  family_doctor_name: Joi.string().max(255).optional().allow('', null),
  family_doctor_phone: Joi.string().max(20).optional().allow('', null),
});

const listStudentsSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  class: Joi.string().max(10).optional(),
  curriculum: Joi.string().max(50).optional(),
  status: Joi.string().valid('Active', 'Inactive', 'Graduated', 'Transferred', 'Suspended').optional(),
  search: Joi.string().optional(),
  page: Joi.number().integer().min(1).optional(),
  page_size: Joi.number().integer().min(1).max(500).optional(),
  sort_by: Joi.string().valid('first_name', 'last_name', 'roll_no', 'admission_date', 'class').optional(),
  sort_order: Joi.string().valid('asc', 'desc').optional(),
  include: Joi.string().optional(), // comma-separated: guardians,medical,documents
});

module.exports = {
  studentSchema,
  studentUpdateSchema,
  guardianSchema,
  medicalRecordSchema,
  listStudentsSchema,
};
