const pool = require('../../../shared/config/database');
const { NotFoundError, ValidationError } = require('../../../shared/utils/errors');

/**
 * CRM Service
 * Business logic for lead management, activities, campaigns, and pipeline
 */

class CRMService {
  // =============================================
  // LEADS
  // =============================================

  /**
   * Create lead
   */
  async createLead(data, userId) {
    const {
      school_id,
      first_name,
      last_name,
      email,
      phone,
      parent_name,
      parent_email,
      parent_phone,
      student_grade_level,
      source,
      status,
      assigned_to,
      notes,
      metadata
    } = data;

    const result = await pool.query(
      `INSERT INTO crm.leads (
        school_id, first_name, last_name, email, phone, parent_name, parent_email,
        parent_phone, student_grade_level, source, status, assigned_to, notes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        school_id, first_name, last_name, email, phone, parent_name, parent_email,
        parent_phone, student_grade_level, source, status, assigned_to, notes,
        JSON.stringify(metadata)
      ]
    );

    const lead = result.rows[0];

    // Log creation activity
    await this.createActivity({
      lead_id: lead.lead_id,
      activity_type: 'note',
      subject: 'Lead Created',
      description: `Lead created from source: ${source || 'unknown'}`,
      metadata: { created_by: userId }
    }, userId);

    return lead;
  }

  /**
   * Get lead by ID
   */
  async getLead(leadId) {
    const result = await pool.query(
      `SELECT l.*,
              COUNT(a.activity_id) as activity_count,
              MAX(a.activity_date) as last_activity_date
       FROM crm.leads l
       LEFT JOIN crm.lead_activities a ON l.lead_id = a.lead_id
       WHERE l.lead_id = $1
       GROUP BY l.lead_id`,
      [leadId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Lead not found');
    }

    return result.rows[0];
  }

  /**
   * List leads
   */
  async listLeads(filters) {
    const { school_id, status, assigned_to, source, min_score, search, page, limit } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT l.*,
             COUNT(a.activity_id) as activity_count,
             MAX(a.activity_date) as last_activity_date
      FROM crm.leads l
      LEFT JOIN crm.lead_activities a ON l.lead_id = a.lead_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (school_id) {
      query += ` AND l.school_id = $${paramCount++}`;
      params.push(school_id);
    }

    if (status) {
      query += ` AND l.status = $${paramCount++}`;
      params.push(status);
    }

    if (assigned_to) {
      query += ` AND l.assigned_to = $${paramCount++}`;
      params.push(assigned_to);
    }

    if (source) {
      query += ` AND l.source = $${paramCount++}`;
      params.push(source);
    }

    if (min_score) {
      query += ` AND l.lead_score >= $${paramCount++}`;
      params.push(min_score);
    }

    if (search) {
      query += ` AND (l.first_name ILIKE $${paramCount} OR l.last_name ILIKE $${paramCount} OR l.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` GROUP BY l.lead_id ORDER BY l.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM crm.leads WHERE 1=1';
    const countParams = params.slice(0, -2);

    if (school_id) countQuery += ' AND school_id = $1';
    if (status) countQuery += ` AND status = $${countParams.indexOf(status) + 1}`;
    if (assigned_to) countQuery += ` AND assigned_to = $${countParams.indexOf(assigned_to) + 1}`;
    if (source) countQuery += ` AND source = $${countParams.indexOf(source) + 1}`;
    if (min_score) countQuery += ` AND lead_score >= $${countParams.indexOf(min_score) + 1}`;
    if (search) countQuery += ` AND (first_name ILIKE $${countParams.indexOf(`%${search}%`) + 1} OR last_name ILIKE $${countParams.indexOf(`%${search}%`) + 1} OR email ILIKE $${countParams.indexOf(`%${search}%`) + 1})`;

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      leads: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update lead
   */
  async updateLead(leadId, data, userId) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Track status change
    const oldStatus = await pool.query(
      'SELECT status FROM crm.leads WHERE lead_id = $1',
      [leadId]
    );

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'metadata') {
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
    values.push(leadId);

    const result = await pool.query(
      `UPDATE crm.leads
       SET ${updates.join(', ')}
       WHERE lead_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Lead not found');
    }

    // Log status change
    if (data.status && oldStatus.rows[0] && data.status !== oldStatus.rows[0].status) {
      await this.createActivity({
        lead_id: leadId,
        activity_type: 'status_change',
        subject: 'Status Changed',
        description: `Status changed from ${oldStatus.rows[0].status} to ${data.status}`,
        metadata: { updated_by: userId }
      }, userId);
    }

    return result.rows[0];
  }

  /**
   * Delete lead
   */
  async deleteLead(leadId) {
    const result = await pool.query(
      `DELETE FROM crm.leads WHERE lead_id = $1 RETURNING lead_id`,
      [leadId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Lead not found');
    }

    return { message: 'Lead deleted successfully', lead_id: leadId };
  }

  // =============================================
  // LEAD ACTIVITIES
  // =============================================

  /**
   * Create activity
   */
  async createActivity(data, userId) {
    const { lead_id, activity_type, subject, description, activity_date, metadata } = data;

    const result = await pool.query(
      `INSERT INTO crm.lead_activities (
        lead_id, activity_type, subject, description, activity_date, created_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        lead_id, activity_type, subject, description,
        activity_date || new Date(), userId, JSON.stringify(metadata)
      ]
    );

    return result.rows[0];
  }

  /**
   * Get lead activities
   */
  async getLeadActivities(leadId, filters = {}) {
    const { activity_type, start_date, end_date, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*, u.first_name, u.last_name
      FROM crm.lead_activities a
      LEFT JOIN public.users u ON a.created_by = u.user_id
      WHERE a.lead_id = $1
    `;
    const params = [leadId];
    let paramCount = 2;

    if (activity_type) {
      query += ` AND a.activity_type = $${paramCount++}`;
      params.push(activity_type);
    }

    if (start_date) {
      query += ` AND a.activity_date >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND a.activity_date <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ` ORDER BY a.activity_date DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM crm.lead_activities WHERE lead_id = $1';
    const countParams = [leadId];

    if (activity_type) {
      countQuery += ' AND activity_type = $2';
      countParams.push(activity_type);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      activities: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // =============================================
  // PIPELINE STAGES
  // =============================================

  /**
   * Create pipeline stage
   */
  async createStage(data) {
    const { school_id, stage_name, stage_order, conversion_probability, is_active } = data;

    const result = await pool.query(
      `INSERT INTO crm.pipeline_stages (
        school_id, stage_name, stage_order, conversion_probability, is_active
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [school_id, stage_name, stage_order, conversion_probability, is_active]
    );

    return result.rows[0];
  }

  /**
   * Get pipeline stages
   */
  async getStages(schoolId) {
    const result = await pool.query(
      `SELECT * FROM crm.pipeline_stages
       WHERE school_id = $1 AND is_active = TRUE
       ORDER BY stage_order ASC`,
      [schoolId]
    );

    return result.rows;
  }

  /**
   * Update stage
   */
  async updateStage(stageId, data) {
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

    values.push(stageId);

    const result = await pool.query(
      `UPDATE crm.pipeline_stages
       SET ${updates.join(', ')}
       WHERE stage_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Pipeline stage not found');
    }

    return result.rows[0];
  }

  /**
   * Delete stage
   */
  async deleteStage(stageId) {
    const result = await pool.query(
      `DELETE FROM crm.pipeline_stages WHERE stage_id = $1 RETURNING stage_id`,
      [stageId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Pipeline stage not found');
    }

    return { message: 'Pipeline stage deleted successfully', stage_id: stageId };
  }

  // =============================================
  // CAMPAIGNS
  // =============================================

  /**
   * Create campaign
   */
  async createCampaign(data, userId) {
    const {
      school_id,
      campaign_name,
      description,
      campaign_type,
      start_date,
      end_date,
      budget,
      status,
      metrics
    } = data;

    const result = await pool.query(
      `INSERT INTO crm.campaigns (
        school_id, campaign_name, description, campaign_type, start_date,
        end_date, budget, status, metrics, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        school_id, campaign_name, description, campaign_type, start_date,
        end_date, budget, status, JSON.stringify(metrics), userId
      ]
    );

    return result.rows[0];
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId) {
    const result = await pool.query(
      `SELECT * FROM crm.campaigns WHERE campaign_id = $1`,
      [campaignId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Campaign not found');
    }

    return result.rows[0];
  }

  /**
   * List campaigns
   */
  async listCampaigns(filters) {
    const { school_id, status, campaign_type, page, limit } = filters;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM crm.campaigns WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (school_id) {
      query += ` AND school_id = $${paramCount++}`;
      params.push(school_id);
    }

    if (status) {
      query += ` AND status = $${paramCount++}`;
      params.push(status);
    }

    if (campaign_type) {
      query += ` AND campaign_type = $${paramCount++}`;
      params.push(campaign_type);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM crm.campaigns WHERE 1=1';
    const countParams = params.slice(0, -2);

    if (school_id) countQuery += ' AND school_id = $1';
    if (status) countQuery += ` AND status = $${countParams.indexOf(status) + 1}`;
    if (campaign_type) countQuery += ` AND campaign_type = $${countParams.indexOf(campaign_type) + 1}`;

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      campaigns: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update campaign
   */
  async updateCampaign(campaignId, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'metrics') {
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

    values.push(campaignId);

    const result = await pool.query(
      `UPDATE crm.campaigns
       SET ${updates.join(', ')}
       WHERE campaign_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Campaign not found');
    }

    return result.rows[0];
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId) {
    const result = await pool.query(
      `DELETE FROM crm.campaigns WHERE campaign_id = $1 RETURNING campaign_id`,
      [campaignId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Campaign not found');
    }

    return { message: 'Campaign deleted successfully', campaign_id: campaignId };
  }

  // =============================================
  // ANALYTICS
  // =============================================

  /**
   * Get CRM dashboard metrics
   */
  async getDashboardMetrics(schoolId) {
    // Lead counts by status
    const statusResult = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM crm.leads
       WHERE school_id = $1
       GROUP BY status`,
      [schoolId]
    );

    // Lead sources
    const sourceResult = await pool.query(
      `SELECT source, COUNT(*) as count
       FROM crm.leads
       WHERE school_id = $1
       GROUP BY source`,
      [schoolId]
    );

    // Conversion rate
    const conversionResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'enrolled')::FLOAT /
         NULLIF(COUNT(*)::FLOAT, 0) * 100 as conversion_rate,
         COUNT(*) as total_leads,
         COUNT(*) FILTER (WHERE status = 'enrolled') as enrolled_count
       FROM crm.leads
       WHERE school_id = $1`,
      [schoolId]
    );

    // Average lead score
    const scoreResult = await pool.query(
      `SELECT AVG(lead_score)::INTEGER as avg_score
       FROM crm.leads
       WHERE school_id = $1`,
      [schoolId]
    );

    return {
      leads_by_status: statusResult.rows,
      leads_by_source: sourceResult.rows,
      conversion_rate: parseFloat(conversionResult.rows[0]?.conversion_rate || 0).toFixed(2),
      total_leads: parseInt(conversionResult.rows[0]?.total_leads || 0),
      enrolled_count: parseInt(conversionResult.rows[0]?.enrolled_count || 0),
      average_lead_score: parseInt(scoreResult.rows[0]?.avg_score || 0)
    };
  }
}

module.exports = new CRMService();
