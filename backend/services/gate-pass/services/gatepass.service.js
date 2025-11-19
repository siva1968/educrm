const { query, transaction } = require('../../../shared/config/database');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { NotFoundError, BadRequestError } = require('../../../shared/utils/errors');
const logger = require('../../../shared/utils/logger');

class GatePassService {
  /**
   * Generate unique pass number
   */
  generatePassNumber() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `GP${date}${random}`;
  }

  /**
   * Create gate pass request
   */
  async createGatePass(passData, userId) {
    try {
      const passId = uuidv4();
      const passNumber = this.generatePassNumber();

      // Generate QR code data
      const qrData = JSON.stringify({
        pass_id: passId,
        pass_number: passNumber,
        student_id: passData.student_id,
        valid_from: passData.valid_from,
      });

      // Generate QR code as data URL
      const qrCodeUrl = await QRCode.toDataURL(qrData);

      const result = await query(
        `INSERT INTO gate_pass_mgmt.gate_passes (
          pass_id, student_id, school_id, pass_number, pass_type,
          valid_from, valid_until, reason_category, reason_description,
          requested_by_parent_id, authorized_contact_name, authorized_contact_phone,
          authorized_contact_relation, authorized_contact_id_proof,
          qr_code_data, qr_code_url, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING *`,
        [
          passId,
          passData.student_id,
          passData.school_id,
          passNumber,
          passData.pass_type,
          passData.valid_from,
          passData.valid_until || null,
          passData.reason_category || null,
          passData.reason_description,
          passData.requested_by_parent_id || null,
          passData.authorized_contact_name || null,
          passData.authorized_contact_phone || null,
          passData.authorized_contact_relation || null,
          passData.authorized_contact_id_proof || null,
          qrData,
          qrCodeUrl,
          userId,
          userId
        ]
      );

      logger.info(`Gate pass created: ${passId} for student: ${passData.student_id}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating gate pass: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get gate pass by ID
   */
  async getGatePassById(passId) {
    const result = await query(
      `SELECT gp.*, s.first_name, s.last_name, s.class, s.roll_no, s.photo_url
       FROM gate_pass_mgmt.gate_passes gp
       JOIN sis_core.students s ON gp.student_id = s.student_id
       WHERE gp.pass_id = $1`,
      [passId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Gate pass not found');
    }

    return result.rows[0];
  }

  /**
   * Get gate pass by pass number
   */
  async getGatePassByNumber(passNumber) {
    const result = await query(
      `SELECT gp.*, s.first_name, s.last_name, s.class, s.roll_no, s.photo_url
       FROM gate_pass_mgmt.gate_passes gp
       JOIN sis_core.students s ON gp.student_id = s.student_id
       WHERE gp.pass_number = $1`,
      [passNumber]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Gate pass not found');
    }

    return result.rows[0];
  }

  /**
   * List gate passes with filtering
   */
  async listGatePasses(filters) {
    let queryText = `
      SELECT gp.*, s.first_name, s.last_name, s.class, s.roll_no
      FROM gate_pass_mgmt.gate_passes gp
      JOIN sis_core.students s ON gp.student_id = s.student_id
      WHERE 1=1
    `;
    const params = [];
    let paramCounter = 1;

    if (filters.school_id) {
      queryText += ` AND gp.school_id = $${paramCounter}`;
      params.push(filters.school_id);
      paramCounter++;
    }

    if (filters.student_id) {
      queryText += ` AND gp.student_id = $${paramCounter}`;
      params.push(filters.student_id);
      paramCounter++;
    }

    if (filters.approval_status) {
      queryText += ` AND gp.approval_status = $${paramCounter}`;
      params.push(filters.approval_status);
      paramCounter++;
    }

    if (filters.status) {
      queryText += ` AND gp.status = $${paramCounter}`;
      params.push(filters.status);
      paramCounter++;
    }

    if (filters.from_date) {
      queryText += ` AND gp.valid_from >= $${paramCounter}`;
      params.push(filters.from_date);
      paramCounter++;
    }

    if (filters.to_date) {
      queryText += ` AND gp.valid_from <= $${paramCounter}`;
      params.push(filters.to_date);
      paramCounter++;
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM (${queryText}) as counted`;
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].total);

    // Add sorting and pagination
    queryText += ` ORDER BY gp.created_at DESC`;

    const page = parseInt(filters.page) || 1;
    const pageSize = Math.min(parseInt(filters.page_size) || 50, 500);
    const offset = (page - 1) * pageSize;

    queryText += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(pageSize, offset);

    const result = await query(queryText, params);

    return {
      gatePasses: result.rows,
      pagination: {
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  }

  /**
   * Approve or reject gate pass
   */
  async approveGatePass(passId, approvalData, userId) {
    const result = await query(
      `UPDATE gate_pass_mgmt.gate_passes
       SET approval_status = $1, approved_by_principal = $2, approved_at = CURRENT_TIMESTAMP,
           rejection_reason = $3, admin_notes = $4, status = $5, updated_at = CURRENT_TIMESTAMP
       WHERE pass_id = $6
       RETURNING *`,
      [
        approvalData.approval_status,
        userId,
        approvalData.rejection_reason || null,
        approvalData.admin_notes || null,
        approvalData.approval_status === 'Approved' ? 'Active' : 'Cancelled',
        passId
      ]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Gate pass not found');
    }

    logger.info(`Gate pass ${approvalData.approval_status}: ${passId}`);
    return result.rows[0];
  }

  /**
   * Verify gate pass (entry/exit)
   */
  async verifyGatePass(verificationData, userId) {
    try {
      // Get gate pass by number
      const gatePass = await this.getGatePassByNumber(verificationData.pass_number);

      // Check if pass is approved
      if (gatePass.approval_status !== 'Approved') {
        throw new BadRequestError('Gate pass is not approved');
      }

      // Check if pass is active
      if (gatePass.status !== 'Active') {
        throw new BadRequestError(`Gate pass is ${gatePass.status.toLowerCase()}`);
      }

      // Check validity
      const now = new Date();
      const validFrom = new Date(gatePass.valid_from);
      if (now < validFrom) {
        throw new BadRequestError('Gate pass is not yet valid');
      }

      if (gatePass.valid_until) {
        const validUntil = new Date(gatePass.valid_until);
        if (now > validUntil) {
          throw new BadRequestError('Gate pass has expired');
        }
      }

      // Update gate pass with entry details
      await query(
        `UPDATE gate_pass_mgmt.gate_passes
         SET gate_entry_time = CURRENT_TIMESTAMP,
             gate_entry_verified_by = $1,
             actual_pickup_person_name = $2,
             actual_pickup_person_id_proof = $3,
             security_notes = $4,
             status = 'Verified',
             updated_at = CURRENT_TIMESTAMP
         WHERE pass_id = $5`,
        [
          userId,
          verificationData.actual_pickup_person_name || null,
          verificationData.actual_pickup_person_id_proof || null,
          verificationData.security_notes || null,
          gatePass.pass_id
        ]
      );

      // Create access log
      await this.logGateAccess({
        student_id: gatePass.student_id,
        school_id: gatePass.school_id,
        access_type: 'Exit',
        gate_id: verificationData.gate_id,
        gate_name: verificationData.gate_name,
        verification_method: verificationData.verification_method,
        pass_id: gatePass.pass_id,
        temperature_recorded: verificationData.temperature_recorded,
      }, userId);

      logger.info(`Gate pass verified: ${gatePass.pass_number}`);
      return await this.getGatePassById(gatePass.pass_id);
    } catch (error) {
      logger.error(`Error verifying gate pass: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log gate access (entry/exit)
   */
  async logGateAccess(accessData, userId) {
    try {
      const logId = uuidv4();

      // Get student class info
      const studentInfo = await query(
        'SELECT class, section FROM sis_core.students WHERE student_id = $1',
        [accessData.student_id]
      );

      const result = await query(
        `INSERT INTO gate_pass_mgmt.gate_access_logs (
          log_id, student_id, school_id, access_type, access_timestamp,
          gate_id, gate_name, verification_method, verified_by_user_id,
          verified_by_name, pass_id, student_class, student_section,
          temperature_recorded, notes
        ) VALUES (
          $1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING *`,
        [
          logId,
          accessData.student_id,
          accessData.school_id,
          accessData.access_type,
          accessData.gate_id || null,
          accessData.gate_name || null,
          accessData.verification_method || 'Manual Check',
          userId,
          null, // Will be populated from user info in future
          accessData.pass_id || null,
          studentInfo.rows[0]?.class || null,
          studentInfo.rows[0]?.section || null,
          accessData.temperature_recorded || null,
          accessData.notes || null
        ]
      );

      logger.info(`Gate access logged: ${logId} for student: ${accessData.student_id}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error logging gate access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Register visitor
   */
  async registerVisitor(visitorData, userId) {
    try {
      const visitorId = uuidv4();

      const result = await query(
        `INSERT INTO gate_pass_mgmt.visitors (
          visitor_id, school_id, visitor_name, visitor_phone, visitor_email,
          visitor_id_proof_type, visitor_id_proof_number, purpose, purpose_description,
          meeting_with_student_id, meeting_with_staff_id, meeting_with_name,
          check_in_time, expected_checkout_time, approval_status, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, $13, 'Pending', 'Pending'
        ) RETURNING *`,
        [
          visitorId,
          visitorData.school_id,
          visitorData.visitor_name,
          visitorData.visitor_phone,
          visitorData.visitor_email || null,
          visitorData.visitor_id_proof_type || null,
          visitorData.visitor_id_proof_number || null,
          visitorData.purpose,
          visitorData.purpose_description || null,
          visitorData.meeting_with_student_id || null,
          visitorData.meeting_with_staff_id || null,
          visitorData.meeting_with_name || null,
          visitorData.expected_checkout_time || null
        ]
      );

      logger.info(`Visitor registered: ${visitorId}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error registering visitor: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check out visitor
   */
  async checkoutVisitor(visitorId, userId) {
    const result = await query(
      `UPDATE gate_pass_mgmt.visitors
       SET actual_checkout_time = CURRENT_TIMESTAMP, status = 'Checked Out'
       WHERE visitor_id = $1
       RETURNING *`,
      [visitorId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Visitor not found');
    }

    logger.info(`Visitor checked out: ${visitorId}`);
    return result.rows[0];
  }

  /**
   * Get gate access logs
   */
  async getAccessLogs(schoolId, filters = {}) {
    let queryText = `
      SELECT l.*, s.first_name, s.last_name, s.roll_no
      FROM gate_pass_mgmt.gate_access_logs l
      JOIN sis_core.students s ON l.student_id = s.student_id
      WHERE l.school_id = $1
    `;
    const params = [schoolId];
    let paramCounter = 2;

    if (filters.student_id) {
      queryText += ` AND l.student_id = $${paramCounter}`;
      params.push(filters.student_id);
      paramCounter++;
    }

    if (filters.from_date) {
      queryText += ` AND l.access_timestamp >= $${paramCounter}`;
      params.push(filters.from_date);
      paramCounter++;
    }

    if (filters.to_date) {
      queryText += ` AND l.access_timestamp <= $${paramCounter}`;
      params.push(filters.to_date);
      paramCounter++;
    }

    queryText += ` ORDER BY l.access_timestamp DESC LIMIT 100`;

    const result = await query(queryText, params);
    return result.rows;
  }
}

module.exports = new GatePassService();
