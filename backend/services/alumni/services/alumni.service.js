const pool = require('../../../shared/config/database');
const { NotFoundError, ValidationError } = require('../../../shared/utils/errors');

/**
 * Alumni Service
 * Business logic for alumni management, events, donations, and mentorship
 */

class AlumniService {
  // =============================================
  // ALUMNI PROFILES
  // =============================================

  /**
   * Create alumni profile
   */
  async createProfile(data) {
    const {
      student_id,
      school_id,
      graduation_year,
      current_occupation,
      current_employer,
      industry,
      job_title,
      linkedin_url,
      current_city,
      current_country,
      email,
      phone,
      is_willing_to_mentor,
      is_willing_to_recruit,
      privacy_settings
    } = data;

    const result = await pool.query(
      `INSERT INTO alumni.profiles (
        student_id, school_id, graduation_year, current_occupation, current_employer,
        industry, job_title, linkedin_url, current_city, current_country, email, phone,
        is_willing_to_mentor, is_willing_to_recruit, privacy_settings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        student_id, school_id, graduation_year, current_occupation, current_employer,
        industry, job_title, linkedin_url, current_city, current_country, email, phone,
        is_willing_to_mentor, is_willing_to_recruit, JSON.stringify(privacy_settings)
      ]
    );

    return result.rows[0];
  }

  /**
   * Get alumni profile by ID
   */
  async getProfile(alumniId) {
    const result = await pool.query(
      `SELECT ap.*, s.first_name, s.last_name, s.email as student_email
       FROM alumni.profiles ap
       JOIN sis_core.students s ON ap.student_id = s.student_id
       WHERE ap.alumni_id = $1`,
      [alumniId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Alumni profile not found');
    }

    return result.rows[0];
  }

  /**
   * List alumni profiles
   */
  async listProfiles(filters) {
    const {
      school_id,
      graduation_year,
      industry,
      is_willing_to_mentor,
      is_willing_to_recruit,
      search,
      page,
      limit
    } = filters;

    const offset = (page - 1) * limit;

    let query = `
      SELECT ap.*, s.first_name, s.last_name
      FROM alumni.profiles ap
      JOIN sis_core.students s ON ap.student_id = s.student_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (school_id) {
      query += ` AND ap.school_id = $${paramCount++}`;
      params.push(school_id);
    }

    if (graduation_year) {
      query += ` AND ap.graduation_year = $${paramCount++}`;
      params.push(graduation_year);
    }

    if (industry) {
      query += ` AND ap.industry = $${paramCount++}`;
      params.push(industry);
    }

    if (is_willing_to_mentor !== undefined) {
      query += ` AND ap.is_willing_to_mentor = $${paramCount++}`;
      params.push(is_willing_to_mentor);
    }

    if (is_willing_to_recruit !== undefined) {
      query += ` AND ap.is_willing_to_recruit = $${paramCount++}`;
      params.push(is_willing_to_recruit);
    }

    if (search) {
      query += ` AND (s.first_name ILIKE $${paramCount} OR s.last_name ILIKE $${paramCount} OR ap.current_employer ILIKE $${paramCount} OR ap.current_occupation ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY ap.graduation_year DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*)
      FROM alumni.profiles ap
      JOIN sis_core.students s ON ap.student_id = s.student_id
      WHERE 1=1
    `;
    const countParams = params.slice(0, -2);

    if (school_id) countQuery += ' AND ap.school_id = $1';
    if (graduation_year) countQuery += ` AND ap.graduation_year = $${countParams.indexOf(graduation_year) + 1}`;
    if (industry) countQuery += ` AND ap.industry = $${countParams.indexOf(industry) + 1}`;
    if (is_willing_to_mentor !== undefined) countQuery += ` AND ap.is_willing_to_mentor = $${countParams.indexOf(is_willing_to_mentor) + 1}`;
    if (is_willing_to_recruit !== undefined) countQuery += ` AND ap.is_willing_to_recruit = $${countParams.indexOf(is_willing_to_recruit) + 1}`;
    if (search) countQuery += ` AND (s.first_name ILIKE $${countParams.indexOf(`%${search}%`) + 1} OR s.last_name ILIKE $${countParams.indexOf(`%${search}%`) + 1})`;

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      profiles: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update alumni profile
   */
  async updateProfile(alumniId, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'privacy_settings') {
          updates.push(`${key} = $${paramCount++}`);
          values.push(JSON.stringify(value));
        } else {
          updates.push(`${key} = $${paramCount++}`);
          values.push(value);
        }
      }
    });

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(alumniId);

    const result = await pool.query(
      `UPDATE alumni.profiles
       SET ${updates.join(', ')}
       WHERE alumni_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Alumni profile not found');
    }

    return result.rows[0];
  }

  /**
   * Delete alumni profile
   */
  async deleteProfile(alumniId) {
    const result = await pool.query(
      `DELETE FROM alumni.profiles WHERE alumni_id = $1 RETURNING alumni_id`,
      [alumniId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Alumni profile not found');
    }

    return { message: 'Alumni profile deleted successfully', alumni_id: alumniId };
  }

  // =============================================
  // ALUMNI EVENTS
  // =============================================

  /**
   * Create event
   */
  async createEvent(data, userId) {
    const {
      school_id,
      event_name,
      description,
      event_type,
      event_date,
      location,
      is_virtual,
      max_attendees,
      registration_deadline,
      status
    } = data;

    const result = await pool.query(
      `INSERT INTO alumni.events (
        school_id, event_name, description, event_type, event_date, location,
        is_virtual, max_attendees, registration_deadline, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        school_id, event_name, description, event_type, event_date, location,
        is_virtual, max_attendees, registration_deadline, status, userId
      ]
    );

    return result.rows[0];
  }

  /**
   * Get event by ID
   */
  async getEvent(eventId) {
    const result = await pool.query(
      `SELECT e.*,
              COUNT(r.registration_id) as registrations_count,
              SUM(r.plus_one + 1) as total_attendees
       FROM alumni.events e
       LEFT JOIN alumni.event_registrations r ON e.event_id = r.event_id
         AND r.attendance_status != 'cancelled'
       WHERE e.event_id = $1
       GROUP BY e.event_id`,
      [eventId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Event not found');
    }

    return result.rows[0];
  }

  /**
   * List events
   */
  async listEvents(filters) {
    const { school_id, event_type, status, start_date, end_date, page, limit } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT e.*,
             COUNT(r.registration_id) as registrations_count
      FROM alumni.events e
      LEFT JOIN alumni.event_registrations r ON e.event_id = r.event_id
        AND r.attendance_status != 'cancelled'
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (school_id) {
      query += ` AND e.school_id = $${paramCount++}`;
      params.push(school_id);
    }

    if (event_type) {
      query += ` AND e.event_type = $${paramCount++}`;
      params.push(event_type);
    }

    if (status) {
      query += ` AND e.status = $${paramCount++}`;
      params.push(status);
    }

    if (start_date) {
      query += ` AND e.event_date >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND e.event_date <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ` GROUP BY e.event_id ORDER BY e.event_date DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM alumni.events WHERE 1=1';
    const countParams = params.slice(0, -2);

    if (school_id) countQuery += ' AND school_id = $1';
    if (event_type) countQuery += ` AND event_type = $${countParams.indexOf(event_type) + 1}`;
    if (status) countQuery += ` AND status = $${countParams.indexOf(status) + 1}`;
    if (start_date) countQuery += ` AND event_date >= $${countParams.indexOf(start_date) + 1}`;
    if (end_date) countQuery += ` AND event_date <= $${countParams.indexOf(end_date) + 1}`;

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      events: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update event
   */
  async updateEvent(eventId, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(eventId);

    const result = await pool.query(
      `UPDATE alumni.events
       SET ${updates.join(', ')}
       WHERE event_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Event not found');
    }

    return result.rows[0];
  }

  /**
   * Delete event
   */
  async deleteEvent(eventId) {
    const result = await pool.query(
      `DELETE FROM alumni.events WHERE event_id = $1 RETURNING event_id`,
      [eventId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Event not found');
    }

    return { message: 'Event deleted successfully', event_id: eventId };
  }

  // =============================================
  // EVENT REGISTRATIONS
  // =============================================

  /**
   * Register for event
   */
  async registerForEvent(data) {
    const { event_id, alumni_id, plus_one, dietary_restrictions, notes } = data;

    // Check if event is open and has capacity
    const eventResult = await pool.query(
      `SELECT e.*,
              COUNT(r.registration_id) as registrations_count
       FROM alumni.events e
       LEFT JOIN alumni.event_registrations r ON e.event_id = r.event_id
         AND r.attendance_status != 'cancelled'
       WHERE e.event_id = $1
       GROUP BY e.event_id`,
      [event_id]
    );

    if (eventResult.rows.length === 0) {
      throw new NotFoundError('Event not found');
    }

    const event = eventResult.rows[0];

    if (event.status !== 'open') {
      throw new ValidationError('Event is not open for registration');
    }

    if (event.max_attendees && parseInt(event.registrations_count) >= event.max_attendees) {
      throw new ValidationError('Event is full');
    }

    const result = await pool.query(
      `INSERT INTO alumni.event_registrations (
        event_id, alumni_id, plus_one, dietary_restrictions, notes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [event_id, alumni_id, plus_one, dietary_restrictions, notes]
    );

    return result.rows[0];
  }

  /**
   * Get event registrations
   */
  async getEventRegistrations(eventId) {
    const result = await pool.query(
      `SELECT r.*, ap.current_occupation, ap.current_employer,
              s.first_name, s.last_name, s.email
       FROM alumni.event_registrations r
       JOIN alumni.profiles ap ON r.alumni_id = ap.alumni_id
       JOIN sis_core.students s ON ap.student_id = s.student_id
       WHERE r.event_id = $1
       ORDER BY r.registration_date DESC`,
      [eventId]
    );

    return result.rows;
  }

  /**
   * Update registration
   */
  async updateRegistration(registrationId, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(registrationId);

    const result = await pool.query(
      `UPDATE alumni.event_registrations
       SET ${updates.join(', ')}
       WHERE registration_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Registration not found');
    }

    return result.rows[0];
  }

  // =============================================
  // DONATIONS
  // =============================================

  /**
   * Create donation
   */
  async createDonation(data) {
    const {
      school_id,
      alumni_id,
      donor_name,
      donor_email,
      amount,
      currency,
      donation_type,
      purpose,
      payment_method,
      payment_status,
      transaction_id,
      is_anonymous,
      donation_date
    } = data;

    const result = await pool.query(
      `INSERT INTO alumni.donations (
        school_id, alumni_id, donor_name, donor_email, amount, currency, donation_type,
        purpose, payment_method, payment_status, transaction_id, is_anonymous, donation_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        school_id, alumni_id, donor_name, donor_email, amount, currency, donation_type,
        purpose, payment_method, payment_status, transaction_id, is_anonymous, donation_date
      ]
    );

    return result.rows[0];
  }

  /**
   * Get donation by ID
   */
  async getDonation(donationId) {
    const result = await pool.query(
      `SELECT * FROM alumni.donations WHERE donation_id = $1`,
      [donationId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Donation not found');
    }

    return result.rows[0];
  }

  /**
   * List donations
   */
  async listDonations(filters) {
    const { school_id, alumni_id, donation_type, payment_status, start_date, end_date, page, limit } = filters;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM alumni.donations WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (school_id) {
      query += ` AND school_id = $${paramCount++}`;
      params.push(school_id);
    }

    if (alumni_id) {
      query += ` AND alumni_id = $${paramCount++}`;
      params.push(alumni_id);
    }

    if (donation_type) {
      query += ` AND donation_type = $${paramCount++}`;
      params.push(donation_type);
    }

    if (payment_status) {
      query += ` AND payment_status = $${paramCount++}`;
      params.push(payment_status);
    }

    if (start_date) {
      query += ` AND donation_date >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND donation_date <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ` ORDER BY donation_date DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count and sum
    let countQuery = 'SELECT COUNT(*), COALESCE(SUM(amount), 0) as total_amount FROM alumni.donations WHERE 1=1';
    const countParams = params.slice(0, -2);

    if (school_id) countQuery += ' AND school_id = $1';
    if (alumni_id) countQuery += ` AND alumni_id = $${countParams.indexOf(alumni_id) + 1}`;
    if (donation_type) countQuery += ` AND donation_type = $${countParams.indexOf(donation_type) + 1}`;
    if (payment_status) countQuery += ` AND payment_status = $${countParams.indexOf(payment_status) + 1}`;
    if (start_date) countQuery += ` AND donation_date >= $${countParams.indexOf(start_date) + 1}`;
    if (end_date) countQuery += ` AND donation_date <= $${countParams.indexOf(end_date) + 1}`;

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    const totalAmount = parseFloat(countResult.rows[0].total_amount);

    return {
      donations: result.rows,
      total_amount: totalAmount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update donation
   */
  async updateDonation(donationId, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(donationId);

    const result = await pool.query(
      `UPDATE alumni.donations
       SET ${updates.join(', ')}
       WHERE donation_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Donation not found');
    }

    return result.rows[0];
  }

  // =============================================
  // MENTORSHIP
  // =============================================

  /**
   * Create mentorship program
   */
  async createProgram(data) {
    const { school_id, program_name, description, start_date, end_date, status } = data;

    const result = await pool.query(
      `INSERT INTO alumni.mentorship_programs (
        school_id, program_name, description, start_date, end_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [school_id, program_name, description, start_date, end_date, status]
    );

    return result.rows[0];
  }

  /**
   * Get programs
   */
  async getPrograms(schoolId) {
    const result = await pool.query(
      `SELECT p.*,
              COUNT(m.match_id) as total_matches,
              COUNT(m.match_id) FILTER (WHERE m.status = 'active') as active_matches
       FROM alumni.mentorship_programs p
       LEFT JOIN alumni.mentorship_matches m ON p.program_id = m.program_id
       WHERE p.school_id = $1
       GROUP BY p.program_id
       ORDER BY p.created_at DESC`,
      [schoolId]
    );

    return result.rows;
  }

  /**
   * Update program
   */
  async updateProgram(programId, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(programId);

    const result = await pool.query(
      `UPDATE alumni.mentorship_programs
       SET ${updates.join(', ')}
       WHERE program_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Program not found');
    }

    return result.rows[0];
  }

  /**
   * Create mentorship match
   */
  async createMatch(data) {
    const { program_id, mentor_id, mentee_id, status } = data;

    const result = await pool.query(
      `INSERT INTO alumni.mentorship_matches (
        program_id, mentor_id, mentee_id, status
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [program_id, mentor_id, mentee_id, status]
    );

    return result.rows[0];
  }

  /**
   * Get program matches
   */
  async getProgramMatches(programId) {
    const result = await pool.query(
      `SELECT m.*,
              s_mentor.first_name as mentor_first_name,
              s_mentor.last_name as mentor_last_name,
              ap.current_occupation as mentor_occupation,
              s_mentee.first_name as mentee_first_name,
              s_mentee.last_name as mentee_last_name
       FROM alumni.mentorship_matches m
       JOIN alumni.profiles ap ON m.mentor_id = ap.alumni_id
       JOIN sis_core.students s_mentor ON ap.student_id = s_mentor.student_id
       JOIN sis_core.students s_mentee ON m.mentee_id = s_mentee.student_id
       WHERE m.program_id = $1
       ORDER BY m.match_date DESC`,
      [programId]
    );

    return result.rows;
  }

  /**
   * Update match
   */
  async updateMatch(matchId, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    if (data.status === 'completed') {
      updates.push(`completion_date = CURRENT_TIMESTAMP`);
    }

    values.push(matchId);

    const result = await pool.query(
      `UPDATE alumni.mentorship_matches
       SET ${updates.join(', ')}
       WHERE match_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Match not found');
    }

    return result.rows[0];
  }
}

module.exports = new AlumniService();
