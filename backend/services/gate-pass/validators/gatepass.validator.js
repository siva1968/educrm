const Joi = require('joi');

const gatePassSchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  school_id: Joi.string().uuid().required(),
  pass_type: Joi.string().valid('Early Departure', 'Late Arrival', 'Day Off', 'Emergency Pickup', 'Medical Leave').required(),
  valid_from: Joi.date().required(),
  valid_until: Joi.date().min(Joi.ref('valid_from')).optional().allow(null),
  reason_category: Joi.string().valid('Medical', 'Family Event', 'Parent Request', 'Emergency', 'Other').optional(),
  reason_description: Joi.string().required(),
  requested_by_parent_id: Joi.string().uuid().optional(),
  authorized_contact_name: Joi.string().max(255).optional(),
  authorized_contact_phone: Joi.string().max(20).optional(),
  authorized_contact_relation: Joi.string().max(50).optional(),
  authorized_contact_id_proof: Joi.string().max(100).optional(),
});

const approveGatePassSchema = Joi.object({
  approval_status: Joi.string().valid('Approved', 'Rejected').required(),
  rejection_reason: Joi.string().when('approval_status', {
    is: 'Rejected',
    then: Joi.required(),
    otherwise: Joi.optional().allow('', null),
  }),
  admin_notes: Joi.string().optional().allow('', null),
});

const verifyGatePassSchema = Joi.object({
  pass_number: Joi.string().required(),
  gate_id: Joi.string().optional(),
  gate_name: Joi.string().optional(),
  verification_method: Joi.string().valid('QR Scan', 'Manual Check', 'Biometric', 'RFID').default('Manual Check'),
  actual_pickup_person_name: Joi.string().max(255).optional(),
  actual_pickup_person_id_proof: Joi.string().max(100).optional(),
  temperature_recorded: Joi.number().min(90).max(110).optional(),
  security_notes: Joi.string().optional().allow('', null),
});

const gateAccessLogSchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  school_id: Joi.string().uuid().required(),
  access_type: Joi.string().valid('Entry', 'Exit').required(),
  gate_id: Joi.string().optional(),
  gate_name: Joi.string().optional(),
  verification_method: Joi.string().valid('QR Scan', 'Manual Check', 'Biometric', 'RFID').default('Manual Check'),
  pass_id: Joi.string().uuid().optional(),
  temperature_recorded: Joi.number().min(90).max(110).optional(),
  notes: Joi.string().optional().allow('', null),
});

const visitorSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  visitor_name: Joi.string().max(255).required(),
  visitor_phone: Joi.string().max(20).required(),
  visitor_email: Joi.string().email().optional().allow('', null),
  visitor_id_proof_type: Joi.string().max(50).optional(),
  visitor_id_proof_number: Joi.string().max(100).optional(),
  purpose: Joi.string().valid('Parent Meeting', 'Vendor', 'Interview', 'Maintenance', 'Guest Lecture', 'Other').required(),
  purpose_description: Joi.string().optional().allow('', null),
  meeting_with_student_id: Joi.string().uuid().optional(),
  meeting_with_staff_id: Joi.string().uuid().optional(),
  meeting_with_name: Joi.string().max(255).optional(),
  expected_checkout_time: Joi.date().optional(),
});

const gatePassQuerySchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  student_id: Joi.string().uuid().optional(),
  approval_status: Joi.string().valid('Pending', 'Approved', 'Rejected', 'Cancelled').optional(),
  status: Joi.string().valid('Pending', 'Active', 'Verified', 'Completed', 'Cancelled', 'Expired').optional(),
  from_date: Joi.date().optional(),
  to_date: Joi.date().min(Joi.ref('from_date')).optional(),
  page: Joi.number().integer().min(1).optional(),
  page_size: Joi.number().integer().min(1).max(500).optional(),
});

module.exports = {
  gatePassSchema,
  approveGatePassSchema,
  verifyGatePassSchema,
  gateAccessLogSchema,
  visitorSchema,
  gatePassQuerySchema,
};
