const db = require('../../../shared/config/database');
const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ConflictError, ValidationError } = require('../../../shared/utils/errors');

/**
 * Subject Management Service
 * Handles all business logic for subject and syllabus management
 */

class SubjectService {
  /**
   * Create a new subject
   * @param {Object} subjectData - Subject data
   * @param {String} userId - ID of user creating the subject
   * @returns {Object} Created subject
   */
  async createSubject(subjectData, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if subject code already exists for this school
      const existingCheck = await client.query(
        `SELECT subject_id FROM academic.subjects
         WHERE school_id = $1 AND subject_code = $2 AND is_deleted = false`,
        [subjectData.school_id, subjectData.subject_code]
      );

      if (existingCheck.rows.length > 0) {
        throw new ConflictError(`Subject with code '${subjectData.subject_code}' already exists`);
      }

      // Insert subject
      const subjectId = uuidv4();
      const insertQuery = `
        INSERT INTO academic.subjects (
          subject_id, school_id, subject_code, subject_name,
          curriculum, subject_type, credits, applicable_classes,
          description, is_active, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        subjectId,
        subjectData.school_id,
        subjectData.subject_code,
        subjectData.subject_name,
        subjectData.curriculum,
        subjectData.subject_type,
        subjectData.credits || 1.0,
        JSON.stringify(subjectData.applicable_classes),
        subjectData.description || null,
        subjectData.is_active !== undefined ? subjectData.is_active : true,
        userId,
        userId
      ]);

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get subject by ID
   * @param {String} subjectId - Subject ID
   * @param {Boolean} includeSyllabus - Include syllabus data
   * @returns {Object} Subject details
   */
  async getSubjectById(subjectId, includeSyllabus = false) {
    const query = `
      SELECT * FROM academic.subjects
      WHERE subject_id = $1 AND is_deleted = false
    `;

    const result = await db.query(query, [subjectId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Subject not found');
    }

    const subject = result.rows[0];

    // Include syllabus if requested
    if (includeSyllabus) {
      const syllabusQuery = `
        SELECT * FROM academic.subject_syllabus
        WHERE subject_id = $1 AND is_deleted = false
        ORDER BY academic_year DESC, class_level
      `;
      const syllabusResult = await db.query(syllabusQuery, [subjectId]);
      subject.syllabus = syllabusResult.rows;
    }

    return subject;
  }

  /**
   * List subjects with filters and pagination
   * @param {Object} filters - Filter criteria
   * @returns {Object} Subjects list and pagination info
   */
  async listSubjects(filters) {
    const {
      school_id,
      curriculum,
      subject_type,
      class_level,
      is_active,
      search,
      page = 1,
      limit = 20
    } = filters;

    const offset = (page - 1) * limit;
    const conditions = ['is_deleted = false', 'school_id = $1'];
    const params = [school_id];
    let paramCount = 1;

    // Apply filters
    if (curriculum) {
      paramCount++;
      conditions.push(`curriculum = $${paramCount}`);
      params.push(curriculum);
    }

    if (subject_type) {
      paramCount++;
      conditions.push(`subject_type = $${paramCount}`);
      params.push(subject_type);
    }

    if (class_level) {
      paramCount++;
      conditions.push(`applicable_classes @> $${paramCount}::jsonb`);
      params.push(JSON.stringify([class_level]));
    }

    if (is_active !== undefined) {
      paramCount++;
      conditions.push(`is_active = $${paramCount}`);
      params.push(is_active);
    }

    if (search) {
      paramCount++;
      conditions.push(`(subject_name ILIKE $${paramCount} OR subject_code ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }

    // Count total records
    const countQuery = `
      SELECT COUNT(*) FROM academic.subjects
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await db.query(countQuery, params);
    const totalRecords = parseInt(countResult.rows[0].count);

    // Fetch paginated records
    const dataQuery = `
      SELECT * FROM academic.subjects
      WHERE ${conditions.join(' AND ')}
      ORDER BY subject_name ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await db.query(dataQuery, params);

    return {
      subjects: result.rows,
      pagination: {
        total: totalRecords,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalRecords / limit)
      }
    };
  }

  /**
   * Update subject
   * @param {String} subjectId - Subject ID
   * @param {Object} updates - Fields to update
   * @param {String} userId - ID of user making update
   * @returns {Object} Updated subject
   */
  async updateSubject(subjectId, updates, userId) {
    // First check if subject exists
    await this.getSubjectById(subjectId);

    const allowedFields = [
      'subject_code',
      'subject_name',
      'curriculum',
      'subject_type',
      'credits',
      'applicable_classes',
      'description',
      'is_active'
    ];

    const updateFields = [];
    const params = [subjectId];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        paramCount++;
        if (key === 'applicable_classes') {
          updateFields.push(`${key} = $${paramCount}::jsonb`);
          params.push(JSON.stringify(updates[key]));
        } else {
          updateFields.push(`${key} = $${paramCount}`);
          params.push(updates[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    paramCount++;
    updateFields.push(`updated_by = $${paramCount}`);
    params.push(userId);

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE academic.subjects
      SET ${updateFields.join(', ')}
      WHERE subject_id = $1 AND is_deleted = false
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Delete subject (soft delete)
   * @param {String} subjectId - Subject ID
   * @param {String} userId - ID of user deleting the subject
   */
  async deleteSubject(subjectId, userId) {
    // Check if subject exists
    await this.getSubjectById(subjectId);

    // Check if subject is being used (has syllabus, assessments, etc.)
    const usageCheck = await db.query(
      `SELECT COUNT(*) FROM academic.subject_syllabus
       WHERE subject_id = $1 AND is_deleted = false`,
      [subjectId]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      throw new ConflictError('Cannot delete subject with existing syllabus. Archive it instead.');
    }

    const query = `
      UPDATE academic.subjects
      SET is_deleted = true, updated_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE subject_id = $1
    `;

    await db.query(query, [subjectId, userId]);

    return { message: 'Subject deleted successfully' };
  }

  /**
   * Add syllabus to a subject
   * @param {Object} syllabusData - Syllabus data
   * @param {String} userId - ID of user creating syllabus
   * @returns {Object} Created syllabus
   */
  async addSyllabus(syllabusData, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify subject exists
      const subjectCheck = await client.query(
        'SELECT subject_id FROM academic.subjects WHERE subject_id = $1 AND is_deleted = false',
        [syllabusData.subject_id]
      );

      if (subjectCheck.rows.length === 0) {
        throw new NotFoundError('Subject not found');
      }

      // Check if syllabus already exists for this combination
      const existingCheck = await client.query(
        `SELECT syllabus_id FROM academic.subject_syllabus
         WHERE subject_id = $1 AND class_level = $2 AND academic_year = $3 AND is_deleted = false`,
        [syllabusData.subject_id, syllabusData.class_level, syllabusData.academic_year]
      );

      if (existingCheck.rows.length > 0) {
        throw new ConflictError(
          `Syllabus already exists for class ${syllabusData.class_level} in academic year ${syllabusData.academic_year}`
        );
      }

      const syllabusId = uuidv4();
      const insertQuery = `
        INSERT INTO academic.subject_syllabus (
          syllabus_id, subject_id, class_level, academic_year, term,
          syllabus_content, status, published_date, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        syllabusId,
        syllabusData.subject_id,
        syllabusData.class_level,
        syllabusData.academic_year,
        syllabusData.term || 'Annual',
        JSON.stringify(syllabusData.syllabus_content),
        syllabusData.status || 'Draft',
        syllabusData.published_date || null,
        userId,
        userId
      ]);

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get syllabus with filters
   * @param {Object} filters - Filter criteria
   * @returns {Array} Syllabus records
   */
  async getSyllabus(filters) {
    const { subject_id, class_level, academic_year, status } = filters;

    const conditions = ['is_deleted = false', 'subject_id = $1'];
    const params = [subject_id];
    let paramCount = 1;

    if (class_level) {
      paramCount++;
      conditions.push(`class_level = $${paramCount}`);
      params.push(class_level);
    }

    if (academic_year) {
      paramCount++;
      conditions.push(`academic_year = $${paramCount}`);
      params.push(academic_year);
    }

    if (status) {
      paramCount++;
      conditions.push(`status = $${paramCount}`);
      params.push(status);
    }

    const query = `
      SELECT s.*, sub.subject_name, sub.subject_code, sub.curriculum
      FROM academic.subject_syllabus s
      JOIN academic.subjects sub ON s.subject_id = sub.subject_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY academic_year DESC, class_level
    `;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Update syllabus
   * @param {String} syllabusId - Syllabus ID
   * @param {Object} updates - Fields to update
   * @param {String} userId - ID of user making update
   * @returns {Object} Updated syllabus
   */
  async updateSyllabus(syllabusId, updates, userId) {
    // Check if syllabus exists
    const checkQuery = 'SELECT syllabus_id FROM academic.subject_syllabus WHERE syllabus_id = $1 AND is_deleted = false';
    const checkResult = await db.query(checkQuery, [syllabusId]);

    if (checkResult.rows.length === 0) {
      throw new NotFoundError('Syllabus not found');
    }

    const allowedFields = ['syllabus_content', 'status', 'published_date'];
    const updateFields = [];
    const params = [syllabusId];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        paramCount++;
        if (key === 'syllabus_content') {
          updateFields.push(`${key} = $${paramCount}::jsonb`);
          params.push(JSON.stringify(updates[key]));
        } else {
          updateFields.push(`${key} = $${paramCount}`);
          params.push(updates[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    // Auto-set published_date when status changes to Published
    if (updates.status === 'Published' && !updates.published_date) {
      paramCount++;
      updateFields.push(`published_date = $${paramCount}`);
      params.push(new Date());
    }

    paramCount++;
    updateFields.push(`updated_by = $${paramCount}`);
    params.push(userId);

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE academic.subject_syllabus
      SET ${updateFields.join(', ')}
      WHERE syllabus_id = $1 AND is_deleted = false
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Get subjects by class level
   * @param {String} schoolId - School ID
   * @param {String} classLevel - Class level
   * @returns {Array} Subjects applicable to the class
   */
  async getSubjectsByClass(schoolId, classLevel) {
    const query = `
      SELECT * FROM academic.subjects
      WHERE school_id = $1
        AND applicable_classes @> $2::jsonb
        AND is_active = true
        AND is_deleted = false
      ORDER BY subject_name
    `;

    const result = await db.query(query, [schoolId, JSON.stringify([classLevel])]);
    return result.rows;
  }

  /**
   * Get subjects by curriculum
   * @param {String} schoolId - School ID
   * @param {String} curriculum - Curriculum type
   * @returns {Array} Subjects for the curriculum
   */
  async getSubjectsByCurriculum(schoolId, curriculum) {
    const query = `
      SELECT * FROM academic.subjects
      WHERE school_id = $1
        AND curriculum = $2
        AND is_active = true
        AND is_deleted = false
      ORDER BY subject_name
    `;

    const result = await db.query(query, [schoolId, curriculum]);
    return result.rows;
  }
}

module.exports = new SubjectService();
