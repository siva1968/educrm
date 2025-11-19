const pool = require('../../../shared/config/database');
const { NotFoundError, ValidationError } = require('../../../shared/utils/errors');

/**
 * Alert Service
 * Business logic for alert rules, instances, and notifications
 */

class AlertService {
  // =============================================
  // ALERT RULES
  // =============================================

  /**
   * Create alert rule
   */
  async createAlertRule(data, userId) {
    const {
      school_id,
      rule_name,
      description,
      entity_type,
      condition_type,
      conditions,
      severity,
      notification_channels,
      recipients,
      is_active
    } = data;

    const result = await pool.query(
      `INSERT INTO alerts.alert_rules (
        school_id, rule_name, description, entity_type, condition_type,
        conditions, severity, notification_channels, recipients, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        school_id, rule_name, description, entity_type, condition_type,
        JSON.stringify(conditions), severity,
        JSON.stringify(notification_channels), JSON.stringify(recipients),
        is_active, userId
      ]
    );

    return result.rows[0];
  }

  /**
   * Get alert rule by ID
   */
  async getAlertRule(ruleId) {
    const result = await pool.query(
      `SELECT * FROM alerts.alert_rules WHERE rule_id = $1`,
      [ruleId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Alert rule not found');
    }

    return result.rows[0];
  }

  /**
   * List alert rules
   */
  async listAlertRules(filters) {
    const { school_id, entity_type, is_active, page, limit } = filters;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM alerts.alert_rules WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (school_id) {
      query += ` AND school_id = $${paramCount++}`;
      params.push(school_id);
    }

    if (entity_type) {
      query += ` AND entity_type = $${paramCount++}`;
      params.push(entity_type);
    }

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount++}`;
      params.push(is_active);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM alerts.alert_rules WHERE 1=1';
    const countParams = params.slice(0, -2); // Remove limit and offset

    if (school_id) countQuery += ' AND school_id = $1';
    if (entity_type) countQuery += ` AND entity_type = $${countParams.indexOf(entity_type) + 1}`;
    if (is_active !== undefined) countQuery += ` AND is_active = $${countParams.indexOf(is_active) + 1}`;

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      rules: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update alert rule
   */
  async updateAlertRule(ruleId, data, userId) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'conditions' || key === 'notification_channels' || key === 'recipients') {
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
    values.push(ruleId);

    const result = await pool.query(
      `UPDATE alerts.alert_rules
       SET ${updates.join(', ')}
       WHERE rule_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Alert rule not found');
    }

    return result.rows[0];
  }

  /**
   * Delete alert rule
   */
  async deleteAlertRule(ruleId) {
    const result = await pool.query(
      `DELETE FROM alerts.alert_rules WHERE rule_id = $1 RETURNING rule_id`,
      [ruleId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Alert rule not found');
    }

    return { message: 'Alert rule deleted successfully', rule_id: ruleId };
  }

  // =============================================
  // ALERT INSTANCES
  // =============================================

  /**
   * Trigger alert
   */
  async triggerAlert(data) {
    const {
      rule_id,
      school_id,
      entity_type,
      entity_id,
      severity,
      title,
      message,
      details
    } = data;

    const result = await pool.query(
      `INSERT INTO alerts.alert_instances (
        rule_id, school_id, entity_type, entity_id, severity, title, message, details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        rule_id, school_id, entity_type, entity_id, severity, title, message,
        JSON.stringify(details)
      ]
    );

    const instance = result.rows[0];

    // Queue notifications (would integrate with notification service)
    await this.queueNotifications(instance);

    return instance;
  }

  /**
   * Get alert instance by ID
   */
  async getAlertInstance(instanceId) {
    const result = await pool.query(
      `SELECT ai.*, ar.rule_name, ar.notification_channels
       FROM alerts.alert_instances ai
       JOIN alerts.alert_rules ar ON ai.rule_id = ar.rule_id
       WHERE ai.instance_id = $1`,
      [instanceId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Alert instance not found');
    }

    return result.rows[0];
  }

  /**
   * List alert instances
   */
  async listAlertInstances(filters) {
    const {
      school_id,
      rule_id,
      entity_type,
      entity_id,
      severity,
      status,
      start_date,
      end_date,
      page,
      limit
    } = filters;

    const offset = (page - 1) * limit;

    let query = `
      SELECT ai.*, ar.rule_name
      FROM alerts.alert_instances ai
      JOIN alerts.alert_rules ar ON ai.rule_id = ar.rule_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (school_id) {
      query += ` AND ai.school_id = $${paramCount++}`;
      params.push(school_id);
    }

    if (rule_id) {
      query += ` AND ai.rule_id = $${paramCount++}`;
      params.push(rule_id);
    }

    if (entity_type) {
      query += ` AND ai.entity_type = $${paramCount++}`;
      params.push(entity_type);
    }

    if (entity_id) {
      query += ` AND ai.entity_id = $${paramCount++}`;
      params.push(entity_id);
    }

    if (severity) {
      query += ` AND ai.severity = $${paramCount++}`;
      params.push(severity);
    }

    if (status) {
      query += ` AND ai.status = $${paramCount++}`;
      params.push(status);
    }

    if (start_date) {
      query += ` AND ai.triggered_at >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND ai.triggered_at <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ` ORDER BY ai.triggered_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*)
      FROM alerts.alert_instances ai
      WHERE 1=1
    `;
    const countParams = params.slice(0, -2);

    if (school_id) countQuery += ' AND ai.school_id = $1';
    if (rule_id) countQuery += ` AND ai.rule_id = $${countParams.indexOf(rule_id) + 1}`;
    if (entity_type) countQuery += ` AND ai.entity_type = $${countParams.indexOf(entity_type) + 1}`;
    if (entity_id) countQuery += ` AND ai.entity_id = $${countParams.indexOf(entity_id) + 1}`;
    if (severity) countQuery += ` AND ai.severity = $${countParams.indexOf(severity) + 1}`;
    if (status) countQuery += ` AND ai.status = $${countParams.indexOf(status) + 1}`;
    if (start_date) countQuery += ` AND ai.triggered_at >= $${countParams.indexOf(start_date) + 1}`;
    if (end_date) countQuery += ` AND ai.triggered_at <= $${countParams.indexOf(end_date) + 1}`;

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      instances: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update alert instance
   */
  async updateAlertInstance(instanceId, data, userId) {
    const { status, resolution_notes } = data;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (status) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);

      if (status === 'acknowledged') {
        updates.push(`acknowledged_by = $${paramCount++}`, `acknowledged_at = CURRENT_TIMESTAMP`);
        values.push(userId);
      } else if (status === 'resolved') {
        updates.push(`resolved_by = $${paramCount++}`, `resolved_at = CURRENT_TIMESTAMP`);
        values.push(userId);
      }
    }

    if (resolution_notes) {
      updates.push(`resolution_notes = $${paramCount++}`);
      values.push(resolution_notes);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(instanceId);

    const result = await pool.query(
      `UPDATE alerts.alert_instances
       SET ${updates.join(', ')}
       WHERE instance_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Alert instance not found');
    }

    return result.rows[0];
  }

  /**
   * Queue notifications for alert instance
   */
  async queueNotifications(instance) {
    // Get rule details
    const ruleResult = await pool.query(
      `SELECT notification_channels, recipients FROM alerts.alert_rules WHERE rule_id = $1`,
      [instance.rule_id]
    );

    if (ruleResult.rows.length === 0) {
      return;
    }

    const { notification_channels, recipients } = ruleResult.rows[0];

    // Get recipient users
    const recipientUsers = [];

    if (recipients.roles && recipients.roles.length > 0) {
      // Get users with specified roles
      const roleResult = await pool.query(
        `SELECT user_id FROM public.users
         WHERE school_id = $1 AND role = ANY($2)`,
        [instance.school_id, recipients.roles]
      );
      recipientUsers.push(...roleResult.rows.map(r => r.user_id));
    }

    if (recipients.specific_users && recipients.specific_users.length > 0) {
      recipientUsers.push(...recipients.specific_users);
    }

    // Create notification log entries
    for (const userId of recipientUsers) {
      for (const channel of notification_channels) {
        await pool.query(
          `INSERT INTO alerts.notification_log (
            instance_id, recipient_id, recipient_type, channel, status
          ) VALUES ($1, $2, $3, $4, $5)`,
          [instance.instance_id, userId, 'user', channel, 'pending']
        );
      }
    }

    return { queued: recipientUsers.length * notification_channels.length };
  }

  // =============================================
  // USER SUBSCRIPTIONS
  // =============================================

  /**
   * Create user subscription
   */
  async createSubscription(data) {
    const {
      user_id,
      school_id,
      entity_type,
      entity_id,
      alert_severity,
      channels,
      is_active
    } = data;

    const result = await pool.query(
      `INSERT INTO alerts.user_subscriptions (
        user_id, school_id, entity_type, entity_id, alert_severity, channels, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        user_id, school_id, entity_type, entity_id,
        JSON.stringify(alert_severity), JSON.stringify(channels), is_active
      ]
    );

    return result.rows[0];
  }

  /**
   * Get user subscriptions
   */
  async getUserSubscriptions(userId, schoolId) {
    const result = await pool.query(
      `SELECT * FROM alerts.user_subscriptions
       WHERE user_id = $1 AND school_id = $2
       ORDER BY created_at DESC`,
      [userId, schoolId]
    );

    return result.rows;
  }

  /**
   * Update subscription
   */
  async updateSubscription(subscriptionId, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'alert_severity' || key === 'channels') {
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

    values.push(subscriptionId);

    const result = await pool.query(
      `UPDATE alerts.user_subscriptions
       SET ${updates.join(', ')}
       WHERE subscription_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Subscription not found');
    }

    return result.rows[0];
  }

  /**
   * Delete subscription
   */
  async deleteSubscription(subscriptionId) {
    const result = await pool.query(
      `DELETE FROM alerts.user_subscriptions WHERE subscription_id = $1 RETURNING subscription_id`,
      [subscriptionId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Subscription not found');
    }

    return { message: 'Subscription deleted successfully', subscription_id: subscriptionId };
  }

  // =============================================
  // ALERT EVALUATION (Background Job)
  // =============================================

  /**
   * Evaluate alert rules
   * This would be called by a background job/cron
   */
  async evaluateRules(schoolId) {
    // Get active rules
    const rulesResult = await pool.query(
      `SELECT * FROM alerts.alert_rules
       WHERE school_id = $1 AND is_active = TRUE`,
      [schoolId]
    );

    const triggeredAlerts = [];

    for (const rule of rulesResult.rows) {
      const triggered = await this.evaluateRule(rule);
      if (triggered.length > 0) {
        triggeredAlerts.push(...triggered);
      }
    }

    return {
      evaluated: rulesResult.rows.length,
      triggered: triggeredAlerts.length,
      alerts: triggeredAlerts
    };
  }

  /**
   * Evaluate single rule
   */
  async evaluateRule(rule) {
    const { rule_id, entity_type, condition_type, conditions, severity } = rule;
    const triggeredAlerts = [];

    // Example: Threshold condition for attendance
    if (entity_type === 'attendance' && condition_type === 'threshold') {
      const { metric, operator, value, period_days } = conditions;

      if (metric === 'attendance_rate' && operator === 'less_than') {
        // Check students with low attendance
        const result = await pool.query(
          `SELECT s.student_id, s.first_name, s.last_name,
                  COUNT(CASE WHEN a.status = 'present' THEN 1 END)::FLOAT /
                  NULLIF(COUNT(*)::FLOAT, 0) * 100 as attendance_rate
           FROM sis_core.students s
           LEFT JOIN academic.attendance a ON s.student_id = a.student_id
           WHERE s.school_id = $1
             AND a.attendance_date >= CURRENT_DATE - INTERVAL '${period_days || 30} days'
           GROUP BY s.student_id, s.first_name, s.last_name
           HAVING COUNT(CASE WHEN a.status = 'present' THEN 1 END)::FLOAT /
                  NULLIF(COUNT(*)::FLOAT, 0) * 100 < $2`,
          [rule.school_id, value]
        );

        for (const student of result.rows) {
          triggeredAlerts.push({
            rule_id,
            school_id: rule.school_id,
            entity_type: 'student',
            entity_id: student.student_id,
            severity,
            title: `Low Attendance Alert: ${student.first_name} ${student.last_name}`,
            message: `Student attendance rate is ${student.attendance_rate.toFixed(1)}%, below threshold of ${value}%`,
            details: {
              attendance_rate: student.attendance_rate,
              threshold: value,
              period_days: period_days || 30
            }
          });
        }
      }
    }

    // Trigger all alerts found
    for (const alertData of triggeredAlerts) {
      await this.triggerAlert(alertData);
    }

    return triggeredAlerts;
  }
}

module.exports = new AlertService();
