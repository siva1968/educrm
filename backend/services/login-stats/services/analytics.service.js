const { query, transaction } = require('../../../shared/config/database');
const { v4: uuidv4 } = require('uuid');
const { NotFoundError } = require('../../../shared/utils/errors');
const logger = require('../../../shared/utils/logger');

class AnalyticsService {
  /**
   * Start user session (login)
   */
  async startSession(sessionData) {
    try {
      const sessionId = uuidv4();

      const result = await query(
        `INSERT INTO user_analytics.user_sessions (
          session_id, school_id, user_id, user_role, user_name, login_time,
          ip_address, device_type, device_name, browser_name, browser_version,
          browser_agent, operating_system, platform, country, city, timezone
        ) VALUES (
          $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING *`,
        [
          sessionId,
          sessionData.school_id,
          sessionData.user_id,
          sessionData.user_role,
          sessionData.user_name || null,
          sessionData.ip_address || null,
          sessionData.device_type || 'Unknown',
          sessionData.device_name || null,
          sessionData.browser_name || null,
          sessionData.browser_version || null,
          sessionData.browser_agent || null,
          sessionData.operating_system || null,
          sessionData.platform || 'Web',
          sessionData.country || null,
          sessionData.city || null,
          sessionData.timezone || null
        ]
      );

      logger.info(`Session started: ${sessionId} for user: ${sessionData.user_id}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error starting session: ${error.message}`);
      throw error;
    }
  }

  /**
   * End user session (logout)
   */
  async endSession(sessionId, logoutType = 'Manual') {
    try {
      const result = await query(
        `UPDATE user_analytics.user_sessions
         SET logout_time = CURRENT_TIMESTAMP,
             session_duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - login_time))::INTEGER,
             is_active = FALSE,
             logout_type = $1
         WHERE session_id = $2
         RETURNING *`,
        [logoutType, sessionId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Session not found');
      }

      logger.info(`Session ended: ${sessionId}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error ending session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log user activity
   */
  async logActivity(activityData) {
    try {
      const activityId = uuidv4();

      const result = await query(
        `INSERT INTO user_analytics.user_activity_log (
          activity_id, school_id, user_id, session_id, user_role,
          activity_type, activity_module, activity_description,
          resource_id, resource_type, resource_name,
          http_method, endpoint_url, request_params,
          response_time_ms, status, status_code, error_message,
          ip_address, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) RETURNING *`,
        [
          activityId,
          activityData.school_id,
          activityData.user_id,
          activityData.session_id || null,
          activityData.user_role,
          activityData.activity_type,
          activityData.activity_module,
          activityData.activity_description || null,
          activityData.resource_id || null,
          activityData.resource_type || null,
          activityData.resource_name || null,
          activityData.http_method || null,
          activityData.endpoint_url || null,
          JSON.stringify(activityData.request_params || {}),
          activityData.response_time_ms || null,
          activityData.status || 'Success',
          activityData.status_code || null,
          activityData.error_message || null,
          activityData.ip_address || null,
          JSON.stringify(activityData.metadata || {})
        ]
      );

      // Update session activity count
      if (activityData.session_id) {
        await query(
          `UPDATE user_analytics.user_sessions
           SET actions_count = actions_count + 1
           WHERE session_id = $1`,
          [activityData.session_id]
        );
      }

      return result.rows[0];
    } catch (error) {
      logger.error(`Error logging activity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStatistics(schoolId, filters = {}) {
    let queryText = `
      SELECT * FROM user_analytics.usage_statistics
      WHERE school_id = $1
    `;
    const params = [schoolId];
    let paramCounter = 2;

    if (filters.from_date) {
      queryText += ` AND date >= $${paramCounter}`;
      params.push(filters.from_date);
      paramCounter++;
    }

    if (filters.to_date) {
      queryText += ` AND date <= $${paramCounter}`;
      params.push(filters.to_date);
      paramCounter++;
    }

    if (filters.granularity) {
      queryText += ` AND period_type = $${paramCounter}`;
      params.push(filters.granularity);
      paramCounter++;
    }

    queryText += ` ORDER BY date DESC, hour DESC LIMIT 100`;

    const result = await query(queryText, params);
    return result.rows.map(row => this.formatStatistics(row));
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(schoolId) {
    const result = await query(
      `SELECT
        session_id, user_id, user_name, user_role, login_time,
        device_type, platform, ip_address,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - login_time))::INTEGER as session_duration_seconds
       FROM user_analytics.user_sessions
       WHERE school_id = $1 AND is_active = TRUE
       ORDER BY login_time DESC`,
      [schoolId]
    );

    return result.rows;
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagement(schoolId, filters = {}) {
    let queryText = `
      SELECT * FROM user_analytics.user_engagement
      WHERE school_id = $1
    `;
    const params = [schoolId];
    let paramCounter = 2;

    if (filters.user_id) {
      queryText += ` AND user_id = $${paramCounter}`;
      params.push(filters.user_id);
      paramCounter++;
    }

    if (filters.month_year) {
      queryText += ` AND month_year = $${paramCounter}`;
      params.push(filters.month_year);
      paramCounter++;
    }

    queryText += ` ORDER BY month_year DESC, engagement_score DESC LIMIT 100`;

    const result = await query(queryText, params);
    return result.rows.map(row => this.formatEngagement(row));
  }

  /**
   * Get feature usage
   */
  async getFeatureUsage(schoolId, fromDate, toDate) {
    const result = await query(
      `SELECT * FROM user_analytics.feature_usage
       WHERE school_id = $1
       AND date >= $2 AND date <= $3
       ORDER BY total_uses DESC
       LIMIT 50`,
      [schoolId, fromDate, toDate]
    );

    return result.rows;
  }

  /**
   * Get API performance metrics
   */
  async getAPIPerformance(fromDate, toDate, limit = 50) {
    const result = await query(
      `SELECT
        endpoint_url, http_method,
        SUM(total_requests) as total_requests,
        SUM(successful_requests) as successful_requests,
        SUM(failed_requests) as failed_requests,
        AVG(average_response_time_ms)::INTEGER as avg_response_time_ms,
        MAX(max_response_time_ms) as max_response_time_ms,
        MIN(min_response_time_ms) as min_response_time_ms,
        AVG(error_rate)::DECIMAL(5,2) as avg_error_rate
       FROM user_analytics.api_performance
       WHERE date >= $1 AND date <= $2
       GROUP BY endpoint_url, http_method
       ORDER BY total_requests DESC
       LIMIT $3`,
      [fromDate, toDate, limit]
    );

    return result.rows;
  }

  /**
   * Generate usage dashboard data
   */
  async getDashboardData(schoolId, period = 'today') {
    const now = new Date();
    let fromDate, toDate;

    switch (period) {
      case 'today':
        fromDate = toDate = now.toISOString().split('T')[0];
        break;
      case 'week':
        fromDate = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
        toDate = new Date().toISOString().split('T')[0];
        break;
      case 'month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        toDate = new Date().toISOString().split('T')[0];
        break;
      default:
        fromDate = toDate = new Date().toISOString().split('T')[0];
    }

    const [activeSessions, usageStats, topFeatures] = await Promise.all([
      this.getActiveSessions(schoolId),
      this.getUsageStatistics(schoolId, { from_date: fromDate, to_date: toDate }),
      this.getFeatureUsage(schoolId, fromDate, toDate)
    ]);

    // Calculate summary
    const summary = {
      total_active_sessions: activeSessions.length,
      total_users_today: usageStats.reduce((sum, s) => sum + (s.total_active_users || 0), 0),
      total_actions: usageStats.reduce((sum, s) => sum + (s.total_actions || 0), 0),
      avg_session_duration: usageStats.reduce((sum, s) => sum + (s.average_session_duration_seconds || 0), 0) / (usageStats.length || 1),
    };

    return {
      summary,
      active_sessions: activeSessions.slice(0, 10),
      usage_trends: usageStats,
      top_features: topFeatures.slice(0, 10),
      period,
    };
  }

  /**
   * Aggregate statistics (scheduled job)
   */
  async aggregateStatistics(schoolId, date, hour = null) {
    try {
      const periodType = hour !== null ? 'hourly' : 'daily';

      let timeFilter = 'DATE(login_time) = $2';
      const params = [schoolId, date];

      if (hour !== null) {
        timeFilter += ' AND EXTRACT(HOUR FROM login_time) = $3';
        params.push(hour);
      }

      const stats = await query(
        `SELECT
          COUNT(DISTINCT user_id) as total_unique_users,
          COUNT(DISTINCT CASE WHEN user_role = 'Student' THEN user_id END) as student_logins,
          COUNT(DISTINCT CASE WHEN user_role = 'Parent' THEN user_id END) as parent_logins,
          COUNT(DISTINCT CASE WHEN user_role = 'Teacher' THEN user_id END) as teacher_logins,
          COUNT(DISTINCT CASE WHEN user_role = 'Admin' THEN user_id END) as admin_logins,
          COUNT(*) as total_sessions,
          AVG(session_duration_seconds)::INTEGER as avg_duration,
          COUNT(DISTINCT CASE WHEN device_type = 'Desktop' THEN user_id END) as desktop_users,
          COUNT(DISTINCT CASE WHEN device_type = 'Mobile' THEN user_id END) as mobile_users,
          COUNT(DISTINCT CASE WHEN device_type = 'Tablet' THEN user_id END) as tablet_users,
          SUM(actions_count) as total_actions
         FROM user_analytics.user_sessions
         WHERE school_id = $1 AND ${timeFilter}`,
        params
      );

      const statRecord = stats.rows[0];

      // Upsert statistics
      await query(
        `INSERT INTO user_analytics.usage_statistics (
          school_id, date, hour, period_type, total_unique_users,
          student_logins, parent_logins, teacher_logins, admin_logins,
          total_sessions, average_session_duration_seconds,
          desktop_users, mobile_users, tablet_users, total_actions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (school_id, date, hour, period_type)
        DO UPDATE SET
          total_unique_users = EXCLUDED.total_unique_users,
          student_logins = EXCLUDED.student_logins,
          parent_logins = EXCLUDED.parent_logins,
          teacher_logins = EXCLUDED.teacher_logins,
          admin_logins = EXCLUDED.admin_logins,
          total_sessions = EXCLUDED.total_sessions,
          average_session_duration_seconds = EXCLUDED.average_session_duration_seconds,
          desktop_users = EXCLUDED.desktop_users,
          mobile_users = EXCLUDED.mobile_users,
          tablet_users = EXCLUDED.tablet_users,
          total_actions = EXCLUDED.total_actions,
          updated_at = CURRENT_TIMESTAMP`,
        [
          schoolId, date, hour, periodType,
          statRecord.total_unique_users,
          statRecord.student_logins,
          statRecord.parent_logins,
          statRecord.teacher_logins,
          statRecord.admin_logins,
          statRecord.total_sessions,
          statRecord.avg_duration,
          statRecord.desktop_users,
          statRecord.mobile_users,
          statRecord.tablet_users,
          statRecord.total_actions
        ]
      );

      logger.info(`Statistics aggregated for ${schoolId} - ${date} ${hour !== null ? hour : 'daily'}`);
    } catch (error) {
      logger.error(`Error aggregating statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format statistics data
   */
  formatStatistics(stats) {
    if (typeof stats.most_accessed_modules === 'string') {
      try {
        stats.most_accessed_modules = JSON.parse(stats.most_accessed_modules);
      } catch (e) {
        stats.most_accessed_modules = [];
      }
    }

    if (typeof stats.most_used_features === 'string') {
      try {
        stats.most_used_features = JSON.parse(stats.most_used_features);
      } catch (e) {
        stats.most_used_features = [];
      }
    }

    return stats;
  }

  /**
   * Format engagement data
   */
  formatEngagement(engagement) {
    ['most_used_features', 'most_visited_modules'].forEach(field => {
      if (typeof engagement[field] === 'string') {
        try {
          engagement[field] = JSON.parse(engagement[field]);
        } catch (e) {
          engagement[field] = [];
        }
      }
    });

    return engagement;
  }
}

module.exports = new AnalyticsService();
