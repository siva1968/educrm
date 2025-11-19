const { query, transaction } = require('../../../shared/config/database');
const cache = require('../../../shared/utils/cache');
const { v4: uuidv4 } = require('uuid');

/**
 * Student Information Service (Database-Integrated Version)
 * Handles all business logic for student management with PostgreSQL
 */

class StudentService {
  constructor() {
    this.cacheTTL = parseInt(process.env.CACHE_TTL_SECONDS) || 300;
  }

  /**
   * Create new student
   * @param {Object} studentData - Student information
   * @returns {Promise<Object>} Created student
   */
  async createStudent(studentData) {
    const sql = `
      INSERT INTO students (
        id, student_number, first_name, last_name, email, phone,
        date_of_birth, gender, blood_group, address, city, state,
        postal_code, country, class_id, section, roll_number,
        academic_year, admission_date, admission_number,
        profile_picture_url, notes, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      ) RETURNING *
    `;

    const id = uuidv4();
    const values = [
      id,
      studentData.studentNumber,
      studentData.firstName,
      studentData.lastName,
      studentData.email,
      studentData.phone || null,
      studentData.dateOfBirth,
      studentData.gender || null,
      studentData.bloodGroup || null,
      studentData.address || null,
      studentData.city || null,
      studentData.state || null,
      studentData.postalCode || null,
      studentData.country || 'India',
      studentData.classId,
      studentData.section || null,
      studentData.rollNumber || null,
      studentData.academicYear,
      studentData.admissionDate,
      studentData.admissionNumber || null,
      studentData.profilePictureUrl || null,
      studentData.notes || null,
      'active'
    ];

    const result = await query(sql, values);

    // Invalidate cache
    await cache.invalidateResource('students');

    return result.rows[0];
  }

  /**
   * Get all students with pagination and filters
   * @param {Object} filters - Filter criteria
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Students and count
   */
  async getAllStudents(filters = {}, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const conditions = ['deleted_at IS NULL'];
    const values = [];
    let paramCount = 1;

    // Build dynamic WHERE clause
    if (filters.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(filters.status);
    }

    if (filters.classId) {
      conditions.push(`class_id = $${paramCount++}`);
      values.push(filters.classId);
    }

    if (filters.section) {
      conditions.push(`section = $${paramCount++}`);
      values.push(filters.section);
    }

    if (filters.academicYear) {
      conditions.push(`academic_year = $${paramCount++}`);
      values.push(filters.academicYear);
    }

    if (filters.search) {
      conditions.push(`(
        first_name ILIKE $${paramCount} OR
        last_name ILIKE $${paramCount} OR
        email ILIKE $${paramCount} OR
        student_number ILIKE $${paramCount}
      )`);
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sorting
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'DESC';
    const validSortColumns = ['first_name', 'last_name', 'admission_date', 'student_number', 'created_at'];
    const orderBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';

    // Get total count
    const countSql = `SELECT COUNT(*) FROM students ${whereClause}`;
    const countResult = await query(countSql, values);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const dataSql = `
      SELECT * FROM students
      ${whereClause}
      ORDER BY ${orderBy} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const dataResult = await query(dataSql, [...values, limit, offset]);

    return {
      students: dataResult.rows,
      total
    };
  }

  /**
   * Get student by ID
   * @param {string} studentId - Student UUID
   * @returns {Promise<Object>} Student data
   */
  async getStudentById(studentId) {
    // Try cache first
    const cacheKey = `student:${studentId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const sql = `
      SELECT s.*, c.name as class_name, c.code as class_code
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = $1 AND s.deleted_at IS NULL
    `;

    const result = await query(sql, [studentId]);

    if (result.rows.length === 0) {
      return null;
    }

    const student = result.rows[0];

    // Cache the result
    await cache.set(cacheKey, student, this.cacheTTL);

    return student;
  }

  /**
   * Update student
   * @param {string} studentId - Student UUID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated student
   */
  async updateStudent(studentId, updates) {
    // Build dynamic UPDATE query
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'date_of_birth',
      'gender', 'blood_group', 'address', 'city', 'state', 'postal_code',
      'country', 'class_id', 'section', 'roll_number', 'profile_picture_url',
      'notes', 'status'
    ];

    // Convert camelCase to snake_case and build SET clause
    Object.keys(updates).forEach(key => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

      if (allowedFields.includes(snakeKey)) {
        fields.push(`${snakeKey} = $${paramCount++}`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(studentId);

    const sql = `
      UPDATE students
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      throw new Error('Student not found');
    }

    // Invalidate cache
    await cache.del(`student:${studentId}`);
    await cache.invalidateResource('students');

    return result.rows[0];
  }

  /**
   * Soft delete student
   * @param {string} studentId - Student UUID
   * @returns {Promise<boolean>} Success status
   */
  async deleteStudent(studentId) {
    const sql = `
      UPDATE students
      SET deleted_at = CURRENT_TIMESTAMP, status = 'inactive'
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `;

    const result = await query(sql, [studentId]);

    if (result.rows.length === 0) {
      throw new Error('Student not found');
    }

    // Invalidate cache
    await cache.del(`student:${studentId}`);
    await cache.invalidateResource('students');

    return true;
  }

  /**
   * Bulk import students
   * @param {Array} students - Array of student data
   * @returns {Promise<Object>} Import results
   */
  async bulkImportStudents(students) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Use transaction for bulk import
    await transaction(async (client) => {
      for (const studentData of students) {
        try {
          const id = uuidv4();

          await client.query(`
            INSERT INTO students (
              id, student_number, first_name, last_name, email,
              date_of_birth, class_id, academic_year, admission_date, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
          `, [
            id,
            studentData.studentNumber,
            studentData.firstName,
            studentData.lastName,
            studentData.email,
            studentData.dateOfBirth,
            studentData.classId,
            studentData.academicYear,
            studentData.admissionDate
          ]);

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            student: studentData.email,
            error: error.message
          });
        }
      }
    });

    // Invalidate cache
    await cache.invalidateResource('students');

    return results;
  }

  /**
   * Get student statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStudentStatistics() {
    const cacheKey = 'students:statistics';
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const sql = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
        COUNT(*) FILTER (WHERE status = 'graduated') as graduated,
        COUNT(*) FILTER (WHERE status = 'withdrawn') as withdrawn,
        COUNT(*) FILTER (WHERE gender = 'male') as male,
        COUNT(*) FILTER (WHERE gender = 'female') as female,
        COUNT(*) FILTER (WHERE gender = 'other') as other
      FROM students
      WHERE deleted_at IS NULL
    `;

    const result = await query(sql);
    const stats = result.rows[0];

    // Cache for 5 minutes
    await cache.set(cacheKey, stats, 300);

    return stats;
  }
}

module.exports = new StudentService();
