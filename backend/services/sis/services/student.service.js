const { query, transaction } = require('../../../shared/config/database');
const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ConflictError } = require('../../../shared/utils/errors');
const logger = require('../../../shared/utils/logger');

class StudentService {
  /**
   * Generate unique admission number
   */
  async generateAdmissionNumber(schoolId) {
    const year = new Date().getFullYear();
    const result = await query(
      `SELECT COUNT(*) as count FROM sis_core.students
       WHERE school_id = $1 AND EXTRACT(YEAR FROM admission_date) = $2`,
      [schoolId, year]
    );

    const count = parseInt(result.rows[0].count) + 1;
    return `ADM${year}${String(count).padStart(5, '0')}`;
  }

  /**
   * Create new student
   */
  async createStudent(studentData, userId) {
    try {
      const studentId = uuidv4();
      const admissionNumber = studentData.admission_number || await this.generateAdmissionNumber(studentData.school_id);

      const result = await transaction(async (client) => {
        // Insert student
        const studentResult = await client.query(
          `INSERT INTO sis_core.students (
            student_id, school_id, roll_no, first_name, middle_name, last_name,
            date_of_birth, gender, email, phone_primary, phone_secondary,
            class, section, curriculum, board_code,
            admission_date, admission_number, previous_school, previous_class,
            address_current, city_current, state_current, pincode_current,
            address_permanent, city_permanent, state_permanent, pincode_permanent,
            aadhar_number, pan_number, birth_certificate_number,
            status, metadata, created_by, updated_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
            $29, $30, $31, $32, $33, $34
          ) RETURNING *`,
          [
            studentId, studentData.school_id, studentData.roll_no, studentData.first_name,
            studentData.middle_name, studentData.last_name, studentData.date_of_birth,
            studentData.gender, studentData.email, studentData.phone_primary, studentData.phone_secondary,
            studentData.class, studentData.section, studentData.curriculum, studentData.board_code,
            studentData.admission_date, admissionNumber, studentData.previous_school, studentData.previous_class,
            studentData.address_current, studentData.city_current, studentData.state_current, studentData.pincode_current,
            studentData.address_permanent, studentData.city_permanent, studentData.state_permanent, studentData.pincode_permanent,
            studentData.aadhar_number, studentData.pan_number, studentData.birth_certificate_number,
            'Active', JSON.stringify(studentData.metadata || {}), userId, userId
          ]
        );

        // Create medical record
        await client.query(
          `INSERT INTO sis_core.student_medical (student_id, created_by, updated_by)
           VALUES ($1, $2, $3)`,
          [studentId, userId, userId]
        );

        return studentResult.rows[0];
      });

      logger.info(`Student created: ${studentId}`);
      return this.formatStudentResponse(result);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new ConflictError('Student with this roll number or email already exists');
      }
      throw error;
    }
  }

  /**
   * Get student by ID
   */
  async getStudentById(studentId, include = []) {
    const studentResult = await query(
      'SELECT * FROM sis_core.students WHERE student_id = $1 AND is_deleted = FALSE',
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      throw new NotFoundError('Student not found');
    }

    const student = studentResult.rows[0];

    // Fetch related data based on include parameter
    if (include.includes('guardians')) {
      const guardians = await query(
        'SELECT * FROM sis_core.student_guardians WHERE student_id = $1 AND is_active = TRUE',
        [studentId]
      );
      student.guardians = guardians.rows;
    }

    if (include.includes('medical')) {
      const medical = await query(
        'SELECT * FROM sis_core.student_medical WHERE student_id = $1',
        [studentId]
      );
      student.medical = medical.rows[0];
    }

    if (include.includes('documents')) {
      const documents = await query(
        'SELECT * FROM sis_core.student_documents WHERE student_id = $1 ORDER BY upload_date DESC',
        [studentId]
      );
      student.documents = documents.rows;
    }

    return this.formatStudentResponse(student);
  }

  /**
   * List students with filtering and pagination
   */
  async listStudents(filters) {
    let queryText = `
      SELECT student_id, roll_no, first_name, middle_name, last_name,
             class, section, status, photo_url, email, phone_primary,
             admission_date, admission_number
      FROM sis_core.students
      WHERE is_deleted = FALSE
    `;
    const params = [];
    let paramCounter = 1;

    // Apply filters
    if (filters.school_id) {
      queryText += ` AND school_id = $${paramCounter}`;
      params.push(filters.school_id);
      paramCounter++;
    }

    if (filters.class) {
      queryText += ` AND class = $${paramCounter}`;
      params.push(filters.class);
      paramCounter++;
    }

    if (filters.curriculum) {
      queryText += ` AND curriculum = $${paramCounter}`;
      params.push(filters.curriculum);
      paramCounter++;
    }

    if (filters.status) {
      queryText += ` AND status = $${paramCounter}`;
      params.push(filters.status);
      paramCounter++;
    }

    if (filters.search) {
      queryText += ` AND (
        first_name ILIKE $${paramCounter} OR
        last_name ILIKE $${paramCounter} OR
        email ILIKE $${paramCounter} OR
        roll_no ILIKE $${paramCounter}
      )`;
      params.push(`%${filters.search}%`);
      paramCounter++;
    }

    // Count total results
    const countQuery = `SELECT COUNT(*) as total FROM (${queryText}) as counted`;
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].total);

    // Add sorting
    const sortBy = filters.sort_by || 'first_name';
    const sortOrder = filters.sort_order || 'asc';
    queryText += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    // Add pagination
    const page = parseInt(filters.page) || 1;
    const pageSize = Math.min(parseInt(filters.page_size) || 50, 500);
    const offset = (page - 1) * pageSize;

    queryText += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(pageSize, offset);

    // Execute query
    const result = await query(queryText, params);

    return {
      students: result.rows.map(s => this.formatStudentResponse(s)),
      pagination: {
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  }

  /**
   * Update student
   */
  async updateStudent(studentId, updates, userId) {
    const allowedFields = [
      'roll_no', 'first_name', 'middle_name', 'last_name', 'date_of_birth', 'gender',
      'email', 'phone_primary', 'phone_secondary', 'class', 'section', 'curriculum',
      'address_current', 'city_current', 'state_current', 'pincode_current',
      'address_permanent', 'city_permanent', 'state_permanent', 'pincode_permanent',
      'status', 'metadata'
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

    updateFields.push(`updated_by = $${paramCounter}`);
    updateValues.push(userId);
    paramCounter++;

    updateValues.push(studentId);

    const result = await query(
      `UPDATE sis_core.students
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $${paramCounter} AND is_deleted = FALSE
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Student not found');
    }

    logger.info(`Student updated: ${studentId}`);
    return this.formatStudentResponse(result.rows[0]);
  }

  /**
   * Soft delete student
   */
  async deleteStudent(studentId, userId) {
    const result = await query(
      `UPDATE sis_core.students
       SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
       WHERE student_id = $2 AND is_deleted = FALSE
       RETURNING student_id`,
      [userId, studentId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Student not found');
    }

    logger.info(`Student deleted: ${studentId}`);
    return true;
  }

  /**
   * Add guardian
   */
  async addGuardian(guardianData, userId) {
    const guardianId = uuidv4();

    const result = await query(
      `INSERT INTO sis_core.student_guardians (
        guardian_id, student_id, guardian_type, title, first_name, last_name,
        email, phone_primary, phone_secondary, occupation, organization, annual_income,
        address, city, state, pincode, aadhar_number, id_proof_type, id_proof_number,
        relation_to_student, is_primary_contact, is_legal_guardian, can_pickup_student,
        created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25
      ) RETURNING *`,
      [
        guardianId, guardianData.student_id, guardianData.guardian_type, guardianData.title,
        guardianData.first_name, guardianData.last_name, guardianData.email,
        guardianData.phone_primary, guardianData.phone_secondary, guardianData.occupation,
        guardianData.organization, guardianData.annual_income, guardianData.address,
        guardianData.city, guardianData.state, guardianData.pincode, guardianData.aadhar_number,
        guardianData.id_proof_type, guardianData.id_proof_number, guardianData.relation_to_student,
        guardianData.is_primary_contact || false, guardianData.is_legal_guardian || false,
        guardianData.can_pickup_student !== false, userId, userId
      ]
    );

    logger.info(`Guardian added: ${guardianId} for student: ${guardianData.student_id}`);
    return result.rows[0];
  }

  /**
   * Update medical record
   */
  async updateMedicalRecord(medicalData, userId) {
    const result = await query(
      `UPDATE sis_core.student_medical
       SET blood_group = $1, height_cm = $2, weight_kg = $3,
           existing_conditions = $4, allergies = $5, dietary_restrictions = $6,
           special_needs = $7, covid_vaccinated = $8, covid_vaccination_dates = $9,
           polio_vaccinated = $10, other_vaccinations = $11,
           emergency_contact_name = $12, emergency_contact_phone = $13,
           emergency_contact_relation = $14, family_doctor_name = $15,
           family_doctor_phone = $16, updated_by = $17, updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $18
       RETURNING *`,
      [
        medicalData.blood_group, medicalData.height_cm, medicalData.weight_kg,
        medicalData.existing_conditions, medicalData.allergies, medicalData.dietary_restrictions,
        medicalData.special_needs, medicalData.covid_vaccinated,
        JSON.stringify(medicalData.covid_vaccination_dates || []),
        medicalData.polio_vaccinated, JSON.stringify(medicalData.other_vaccinations || []),
        medicalData.emergency_contact_name, medicalData.emergency_contact_phone,
        medicalData.emergency_contact_relation, medicalData.family_doctor_name,
        medicalData.family_doctor_phone, userId, medicalData.student_id
      ]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Student medical record not found');
    }

    logger.info(`Medical record updated for student: ${medicalData.student_id}`);
    return result.rows[0];
  }

  /**
   * Format student response (remove sensitive data)
   */
  formatStudentResponse(student) {
    if (!student) return null;

    const { aadhar_number, pan_number, deleted_by, ...safeStudent } = student;

    // Parse metadata if it's a string
    if (typeof safeStudent.metadata === 'string') {
      try {
        safeStudent.metadata = JSON.parse(safeStudent.metadata);
      } catch (e) {
        safeStudent.metadata = {};
      }
    }

    return safeStudent;
  }
}

module.exports = new StudentService();
