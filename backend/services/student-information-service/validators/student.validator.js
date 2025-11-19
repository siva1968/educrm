const Joi = require('joi');

/**
 * Validation schemas for Student Information Service
 */

// Create student schema
const createStudentSchema = Joi.object({
  studentNumber: Joi.string().required().max(50),
  firstName: Joi.string().required().trim().min(1).max(100),
  lastName: Joi.string().required().trim().min(1).max(100),
  email: Joi.string().email().required().lowercase(),
  phone: Joi.string().pattern(/^[+]?[\d\s-()]+$/).min(10).max(20).allow('', null),
  dateOfBirth: Joi.date().iso().max('now').required(),
  gender: Joi.string().valid('male', 'female', 'other').allow('', null),
  bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').allow('', null),

  // Address
  address: Joi.string().max(500).allow('', null),
  city: Joi.string().max(100).allow('', null),
  state: Joi.string().max(100).allow('', null),
  postalCode: Joi.string().max(20).allow('', null),
  country: Joi.string().max(100).default('India'),

  // Academic
  classId: Joi.string().uuid().required(),
  section: Joi.string().max(10).allow('', null),
  rollNumber: Joi.string().max(20).allow('', null),
  academicYear: Joi.string().required().pattern(/^\d{4}-\d{4}$/),
  admissionDate: Joi.date().iso().required(),
  admissionNumber: Joi.string().max(50).allow('', null),

  // Optional
  profilePictureUrl: Joi.string().uri().max(500).allow('', null),
  notes: Joi.string().max(1000).allow('', null)
});

// Update student schema (all fields optional except ID)
const updateStudentSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100),
  lastName: Joi.string().trim().min(1).max(100),
  email: Joi.string().email().lowercase(),
  phone: Joi.string().pattern(/^[+]?[\d\s-()]+$/).min(10).max(20).allow('', null),
  dateOfBirth: Joi.date().iso().max('now'),
  gender: Joi.string().valid('male', 'female', 'other').allow('', null),
  bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').allow('', null),

  address: Joi.string().max(500).allow('', null),
  city: Joi.string().max(100).allow('', null),
  state: Joi.string().max(100).allow('', null),
  postalCode: Joi.string().max(20).allow('', null),
  country: Joi.string().max(100),

  classId: Joi.string().uuid(),
  section: Joi.string().max(10).allow('', null),
  rollNumber: Joi.string().max(20).allow('', null),

  profilePictureUrl: Joi.string().uri().max(500).allow('', null),
  notes: Joi.string().max(1000).allow('', null),
  status: Joi.string().valid('active', 'inactive', 'graduated', 'withdrawn', 'suspended')
}).min(1); // At least one field must be provided

// Student ID parameter schema
const studentIdSchema = Joi.object({
  id: Joi.string().uuid().required()
});

// Query parameters schema
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
  status: Joi.string().valid('active', 'inactive', 'graduated', 'withdrawn', 'suspended'),
  classId: Joi.string().uuid(),
  section: Joi.string(),
  academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/),
  search: Joi.string().max(100),
  sortBy: Joi.string().valid('firstName', 'lastName', 'admissionDate', 'studentNumber'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});

// Bulk import schema
const bulkImportSchema = Joi.object({
  students: Joi.array().items(createStudentSchema).min(1).max(100).required()
});

// Enrollment schema
const enrollmentSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  classId: Joi.string().uuid().required(),
  section: Joi.string().max(10).allow('', null),
  academicYear: Joi.string().required().pattern(/^\d{4}-\d{4}$/),
  enrollmentDate: Joi.date().iso().default(new Date())
});

// Transfer schema
const transferSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  fromClassId: Joi.string().uuid().required(),
  toClassId: Joi.string().uuid().required(),
  effectiveDate: Joi.date().iso().required(),
  reason: Joi.string().max(500).required()
});

// Withdrawal schema
const withdrawalSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  effectiveDate: Joi.date().iso().required(),
  reason: Joi.string().max(500).required()
});

// Guardian schema
const guardianSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  firstName: Joi.string().required().trim().max(100),
  lastName: Joi.string().required().trim().max(100),
  relationship: Joi.string().required().valid('father', 'mother', 'guardian', 'other'),
  email: Joi.string().email().lowercase().allow('', null),
  phone: Joi.string().required().pattern(/^[+]?[\d\s-()]+$/),
  alternatePhone: Joi.string().pattern(/^[+]?[\d\s-()]+$/).allow('', null),
  occupation: Joi.string().max(100).allow('', null),
  address: Joi.string().max(500).allow('', null),
  isPrimary: Joi.boolean().default(false)
});

// Document upload schema
const documentSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  documentType: Joi.string().required().valid(
    'birth_certificate',
    'id_card',
    'photo',
    'medical_certificate',
    'address_proof',
    'previous_school_certificate',
    'other'
  ),
  fileName: Joi.string().required().max(255),
  fileUrl: Joi.string().uri().required(),
  fileSize: Joi.number().positive(),
  mimeType: Joi.string().max(100),
  description: Joi.string().max(500).allow('', null)
});

module.exports = {
  createStudentSchema,
  updateStudentSchema,
  studentIdSchema,
  querySchema,
  bulkImportSchema,
  enrollmentSchema,
  transferSchema,
  withdrawalSchema,
  guardianSchema,
  documentSchema
};
