const pool = require('../../../config/database');
const { NotFoundError, ValidationError, ConflictError } = require('../../../shared/utils/errors');

/**
 * Dashboard Service
 * Handles dashboard CRUD operations and widget management
 */

class DashboardService {
  /**
   * Create a new dashboard
   */
  async createDashboard(dashboardData, userId) {
    const {
      school_id, dashboard_name, dashboard_type, description,
      layout, filters, permissions, is_default, is_active
    } = dashboardData;

    // Check if default dashboard already exists for this type
    if (is_default) {
      const existing = await pool.query(
        `SELECT dashboard_id FROM analytics.dashboards
         WHERE school_id = $1 AND dashboard_type = $2 AND is_default = TRUE AND dashboard_id IS NOT NULL`,
        [school_id, dashboard_type]
      );

      if (existing.rows.length > 0) {
        throw new ConflictError(`A default ${dashboard_type} dashboard already exists for this school`);
      }
    }

    const result = await pool.query(
      `INSERT INTO analytics.dashboards (
        school_id, dashboard_name, dashboard_type, description,
        layout, filters, permissions, is_default, is_active,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
      RETURNING *`,
      [
        school_id, dashboard_name, dashboard_type, description,
        JSON.stringify(layout || []), JSON.stringify(filters || {}),
        JSON.stringify(permissions || { roles: ['admin'] }),
        is_default, is_active, userId
      ]
    );

    return result.rows[0];
  }

  /**
   * Get dashboard by ID
   */
  async getDashboard(dashboardId) {
    const result = await pool.query(
      `SELECT * FROM analytics.dashboards WHERE dashboard_id = $1`,
      [dashboardId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Dashboard not found');
    }

    return result.rows[0];
  }

  /**
   * List dashboards
   */
  async listDashboards(filters) {
    const { school_id, dashboard_type, is_active, page = 1, limit = 20 } = filters;

    let query = `SELECT * FROM analytics.dashboards WHERE school_id = $1`;
    const params = [school_id];
    let paramCount = 1;

    if (dashboard_type) {
      paramCount++;
      query += ` AND dashboard_type = $${paramCount}`;
      params.push(dashboard_type);
    }

    if (is_active !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      params.push(is_active);
    }

    // Count total
    const countResult = await pool.query(
      query.replace('SELECT *', 'SELECT COUNT(*)'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return {
      dashboards: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update dashboard
   */
  async updateDashboard(dashboardId, updateData, userId) {
    const dashboard = await this.getDashboard(dashboardId);

    const fields = [];
    const values = [];
    let paramCount = 0;

    const allowedFields = [
      'dashboard_name', 'description', 'layout', 'filters',
      'permissions', 'is_default', 'is_active'
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);

        // Stringify JSONB fields
        if (['layout', 'filters', 'permissions'].includes(field)) {
          values.push(JSON.stringify(updateData[field]));
        } else {
          values.push(updateData[field]);
        }
      }
    }

    if (fields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    // Add updated_by and updated_at
    paramCount++;
    fields.push(`updated_by = $${paramCount}`);
    values.push(userId);

    paramCount++;
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add dashboard_id for WHERE clause
    paramCount++;
    values.push(dashboardId);

    const result = await pool.query(
      `UPDATE analytics.dashboards
       SET ${fields.join(', ')}
       WHERE dashboard_id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(dashboardId, userId) {
    const dashboard = await this.getDashboard(dashboardId);

    await pool.query(
      `DELETE FROM analytics.dashboards WHERE dashboard_id = $1`,
      [dashboardId]
    );

    return { message: 'Dashboard deleted successfully' };
  }

  /**
   * Get dashboard data with widget values
   */
  async getDashboardData(dashboardId, options = {}) {
    const dashboard = await this.getDashboard(dashboardId);
    const { filters = {}, date_range, refresh = false } = options;

    // Get dashboard configuration
    const layout = typeof dashboard.layout === 'string'
      ? JSON.parse(dashboard.layout)
      : dashboard.layout;

    // Fetch data for each widget
    const widgetDataPromises = layout.map(widget =>
      this.getWidgetData(widget, dashboard.school_id, { filters, date_range, refresh })
    );

    const widgetData = await Promise.all(widgetDataPromises);

    return {
      dashboard: {
        dashboard_id: dashboard.dashboard_id,
        dashboard_name: dashboard.dashboard_name,
        dashboard_type: dashboard.dashboard_type,
        description: dashboard.description
      },
      widgets: layout.map((widget, index) => ({
        ...widget,
        data: widgetData[index]
      })),
      filters: dashboard.filters,
      generated_at: new Date()
    };
  }

  /**
   * Get data for a single widget
   */
  async getWidgetData(widget, schoolId, options = {}) {
    const { data_source, config } = widget;
    const { filters = {}, date_range, refresh = false } = options;

    // Check cache first (unless refresh is requested)
    if (!refresh) {
      const cached = await this.getCachedData(data_source, schoolId, filters);
      if (cached) {
        return cached;
      }
    }

    let data;

    // Fetch data based on data_source
    switch (data_source) {
      case 'attendance':
        data = await this.getAttendanceData(schoolId, { filters, date_range, config });
        break;

      case 'grades':
        data = await this.getGradesData(schoolId, { filters, date_range, config });
        break;

      case 'examinations':
        data = await this.getExaminationsData(schoolId, { filters, date_range, config });
        break;

      case 'assignments':
        data = await this.getAssignmentsData(schoolId, { filters, date_range, config });
        break;

      case 'students':
        data = await this.getStudentsData(schoolId, { filters, config });
        break;

      default:
        data = { error: `Unsupported data source: ${data_source}` };
    }

    // Cache the data (5 minutes TTL)
    await this.cacheData(data_source, schoolId, filters, data, 300);

    return data;
  }

  /**
   * Get attendance data
   */
  async getAttendanceData(schoolId, options = {}) {
    const { filters = {}, date_range, config = {} } = options;

    // Default: last 30 days
    const endDate = date_range?.end_date || new Date().toISOString().split('T')[0];
    const startDate = date_range?.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'present') as present_count,
        COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
        COUNT(*) FILTER (WHERE status = 'late') as late_count,
        COUNT(*) as total_records,
        ROUND(COUNT(*) FILTER (WHERE status = 'present')::DECIMAL / NULLIF(COUNT(*), 0) * 100, 2) as attendance_percentage
       FROM attendance_tracking.attendance
       WHERE school_id = $1
       AND date BETWEEN $2 AND $3
       AND is_deleted = FALSE`,
      [schoolId, startDate, endDate]
    );

    return {
      attendance_rate: parseFloat(result.rows[0].attendance_percentage) || 0,
      present: parseInt(result.rows[0].present_count),
      absent: parseInt(result.rows[0].absent_count),
      late: parseInt(result.rows[0].late_count),
      total: parseInt(result.rows[0].total_records),
      period: { start_date: startDate, end_date: endDate }
    };
  }

  /**
   * Get grades data
   */
  async getGradesData(schoolId, options = {}) {
    const { filters = {}, config = {} } = options;

    const result = await pool.query(
      `SELECT
        COUNT(*) as total_grades,
        ROUND(AVG(marks_obtained), 2) as avg_marks,
        ROUND(AVG(percentage), 2) as avg_percentage,
        COUNT(*) FILTER (WHERE is_passed = TRUE) as passed_count,
        COUNT(*) FILTER (WHERE is_passed = FALSE) as failed_count
       FROM academic.student_grades
       WHERE assessment_id IN (
         SELECT assessment_id FROM academic.assessments WHERE school_id = $1 AND is_deleted = FALSE
       )
       AND is_deleted = FALSE`,
      [schoolId]
    );

    const row = result.rows[0];
    const totalGrades = parseInt(row.total_grades);
    const passedCount = parseInt(row.passed_count);

    return {
      avg_marks: parseFloat(row.avg_marks) || 0,
      avg_percentage: parseFloat(row.avg_percentage) || 0,
      pass_rate: totalGrades > 0 ? Math.round((passedCount / totalGrades) * 100) : 0,
      total_grades: totalGrades,
      passed: passedCount,
      failed: parseInt(row.failed_count)
    };
  }

  /**
   * Get examinations data
   */
  async getExaminationsData(schoolId, options = {}) {
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'Completed') as completed,
        COUNT(*) FILTER (WHERE status = 'Ongoing') as ongoing,
        COUNT(*) FILTER (WHERE status = 'Scheduled') as scheduled,
        COUNT(*) as total
       FROM academic.examinations
       WHERE school_id = $1 AND is_deleted = FALSE`,
      [schoolId]
    );

    return {
      total: parseInt(result.rows[0].total),
      completed: parseInt(result.rows[0].completed),
      ongoing: parseInt(result.rows[0].ongoing),
      scheduled: parseInt(result.rows[0].scheduled)
    };
  }

  /**
   * Get assignments data
   */
  async getAssignmentsData(schoolId, options = {}) {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_assignments,
        COUNT(*) FILTER (WHERE status = 'Published') as published,
        COUNT(*) FILTER (WHERE status = 'Closed') as closed
       FROM academic.assignments
       WHERE school_id = $1 AND is_deleted = FALSE`,
      [schoolId]
    );

    return {
      total: parseInt(result.rows[0].total_assignments),
      published: parseInt(result.rows[0].published),
      closed: parseInt(result.rows[0].closed)
    };
  }

  /**
   * Get students data
   */
  async getStudentsData(schoolId, options = {}) {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_students,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive
       FROM sis_core.students
       WHERE school_id = $1`,
      [schoolId]
    );

    return {
      total: parseInt(result.rows[0].total_students),
      active: parseInt(result.rows[0].active),
      inactive: parseInt(result.rows[0].inactive)
    };
  }

  /**
   * Cache data
   */
  async cacheData(dataSource, schoolId, filters, data, ttlSeconds) {
    const cacheKey = `widget_${dataSource}_${schoolId}_${JSON.stringify(filters)}`;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await pool.query(
      `INSERT INTO analytics.cache (cache_key, school_id, data, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cache_key, school_id)
       DO UPDATE SET data = $3, expires_at = $4, created_at = CURRENT_TIMESTAMP`,
      [cacheKey, schoolId, JSON.stringify(data), expiresAt]
    );
  }

  /**
   * Get cached data
   */
  async getCachedData(dataSource, schoolId, filters) {
    const cacheKey = `widget_${dataSource}_${schoolId}_${JSON.stringify(filters)}`;

    const result = await pool.query(
      `SELECT data FROM analytics.cache
       WHERE cache_key = $1 AND school_id = $2 AND expires_at > CURRENT_TIMESTAMP`,
      [cacheKey, schoolId]
    );

    if (result.rows.length > 0) {
      return typeof result.rows[0].data === 'string'
        ? JSON.parse(result.rows[0].data)
        : result.rows[0].data;
    }

    return null;
  }
}

module.exports = new DashboardService();
