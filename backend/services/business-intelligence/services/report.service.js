const pool = require('../../../config/database');
const { NotFoundError, ValidationError, ConflictError } = require('../../../shared/utils/errors');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

/**
 * Report Service
 * Handles report generation, scheduling, and export
 */

class ReportService {
  /**
   * Create a new report definition
   */
  async createReport(reportData, userId) {
    const {
      school_id, report_name, report_category, description,
      query_config, parameters, schedule, output_format,
      recipients, is_scheduled, is_active
    } = reportData;

    const result = await pool.query(
      `INSERT INTO analytics.reports (
        school_id, report_name, report_category, description,
        query_config, parameters, schedule, output_format,
        recipients, is_scheduled, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
      RETURNING *`,
      [
        school_id, report_name, report_category, description,
        JSON.stringify(query_config), JSON.stringify(parameters || []),
        schedule ? JSON.stringify(schedule) : null, output_format,
        JSON.stringify(recipients || []), is_scheduled, is_active, userId
      ]
    );

    return result.rows[0];
  }

  /**
   * Get report by ID
   */
  async getReport(reportId) {
    const result = await pool.query(
      `SELECT * FROM analytics.reports WHERE report_id = $1`,
      [reportId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Report not found');
    }

    return result.rows[0];
  }

  /**
   * List reports
   */
  async listReports(filters) {
    const {
      school_id, report_category, is_scheduled, is_active,
      search, page = 1, limit = 20
    } = filters;

    let query = `SELECT * FROM analytics.reports WHERE school_id = $1`;
    const params = [school_id];
    let paramCount = 1;

    if (report_category) {
      paramCount++;
      query += ` AND report_category = $${paramCount}`;
      params.push(report_category);
    }

    if (is_scheduled !== undefined) {
      paramCount++;
      query += ` AND is_scheduled = $${paramCount}`;
      params.push(is_scheduled);
    }

    if (is_active !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      params.push(is_active);
    }

    if (search) {
      paramCount++;
      query += ` AND (report_name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
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
      reports: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update report
   */
  async updateReport(reportId, updateData, userId) {
    const report = await this.getReport(reportId);

    const fields = [];
    const values = [];
    let paramCount = 0;

    const allowedFields = [
      'report_name', 'description', 'query_config', 'parameters',
      'schedule', 'output_format', 'recipients', 'is_scheduled', 'is_active'
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);

        // Stringify JSONB fields
        if (['query_config', 'parameters', 'schedule', 'recipients'].includes(field)) {
          values.push(updateData[field] !== null ? JSON.stringify(updateData[field]) : null);
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
    values.push(reportId);

    const result = await pool.query(
      `UPDATE analytics.reports
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE report_id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete report
   */
  async deleteReport(reportId) {
    await this.getReport(reportId);

    await pool.query(
      `DELETE FROM analytics.reports WHERE report_id = $1`,
      [reportId]
    );

    return { message: 'Report deleted successfully' };
  }

  /**
   * Generate report
   */
  async generateReport(reportId, options = {}) {
    const report = await this.getReport(reportId);
    const { parameters = {}, output_format, email_to = [] } = options;

    const executionId = await this.createExecution(reportId, parameters, 'manual', options.userId);

    try {
      // Fetch data based on query_config
      const data = await this.fetchReportData(report, parameters);

      // Generate file based on output format
      const format = output_format || report.output_format;
      const filePath = await this.generateFile(report, data, format, executionId);

      // Get file size
      const stats = fs.statSync(filePath);

      // Update execution record
      await this.updateExecution(executionId, {
        status: 'success',
        file_url: filePath,
        file_size: stats.size,
        row_count: data.length
      });

      // Send email if recipients specified
      const recipients = email_to.length > 0 ? email_to : (report.recipients || []);
      if (recipients.length > 0) {
        // TODO: Integrate with email service
        console.log(`Would send report to: ${recipients.join(', ')}`);
      }

      return {
        execution_id: executionId,
        file_url: filePath,
        file_size: stats.size,
        row_count: data.length,
        format
      };
    } catch (error) {
      await this.updateExecution(executionId, {
        status: 'failed',
        error_message: error.message
      });
      throw error;
    }
  }

  /**
   * Fetch report data based on query configuration
   */
  async fetchReportData(report, parameters = {}) {
    const queryConfig = typeof report.query_config === 'string'
      ? JSON.parse(report.query_config)
      : report.query_config;

    const { source, filters = {}, columns, aggregations = [], groupBy = [], orderBy = [], limit = 1000 } = queryConfig;

    // Merge filters with parameters
    const mergedFilters = { ...filters, ...parameters, school_id: report.school_id };

    let data = [];

    // Fetch data based on source
    switch (source) {
      case 'attendance':
        data = await this.fetchAttendanceData(mergedFilters, columns, aggregations, groupBy, orderBy, limit);
        break;

      case 'grades':
        data = await this.fetchGradesData(mergedFilters, columns, aggregations, groupBy, orderBy, limit);
        break;

      case 'examinations':
        data = await this.fetchExaminationsData(mergedFilters, columns, aggregations, groupBy, orderBy, limit);
        break;

      case 'assignments':
        data = await this.fetchAssignmentsData(mergedFilters, columns, aggregations, groupBy, orderBy, limit);
        break;

      case 'students':
        data = await this.fetchStudentsData(mergedFilters, columns, orderBy, limit);
        break;

      default:
        throw new ValidationError(`Unsupported data source: ${source}`);
    }

    return data;
  }

  /**
   * Fetch attendance data
   */
  async fetchAttendanceData(filters, columns, aggregations, groupBy, orderBy, limit) {
    const { school_id, start_date, end_date, class: className, section } = filters;

    let query = `
      SELECT
        ${columns.join(', ')}
      FROM attendance_tracking.attendance a
      JOIN sis_core.students s ON a.student_id = s.student_id
      WHERE a.school_id = $1 AND a.is_deleted = FALSE
    `;

    const params = [school_id];
    let paramCount = 1;

    if (start_date) {
      paramCount++;
      query += ` AND a.date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND a.date <= $${paramCount}`;
      params.push(end_date);
    }

    if (className) {
      paramCount++;
      query += ` AND s.class = $${paramCount}`;
      params.push(className);
    }

    if (section) {
      paramCount++;
      query += ` AND s.section = $${paramCount}`;
      params.push(section);
    }

    if (groupBy.length > 0) {
      query += ` GROUP BY ${groupBy.join(', ')}`;
    }

    if (orderBy.length > 0) {
      const orderClauses = orderBy.map(o => `${o.field} ${o.direction}`);
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    query += ` LIMIT $${paramCount + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Fetch grades data
   */
  async fetchGradesData(filters, columns, aggregations, groupBy, orderBy, limit) {
    const { school_id, class: className, subject_id, academic_year } = filters;

    let query = `
      SELECT
        ${columns.join(', ')}
      FROM academic.student_grades sg
      JOIN academic.assessments a ON sg.assessment_id = a.assessment_id
      JOIN sis_core.students s ON sg.student_id = s.student_id
      WHERE a.school_id = $1 AND sg.is_deleted = FALSE
    `;

    const params = [school_id];
    let paramCount = 1;

    if (className) {
      paramCount++;
      query += ` AND a.class = $${paramCount}`;
      params.push(className);
    }

    if (subject_id) {
      paramCount++;
      query += ` AND a.subject_id = $${paramCount}`;
      params.push(subject_id);
    }

    if (groupBy.length > 0) {
      query += ` GROUP BY ${groupBy.join(', ')}`;
    }

    if (orderBy.length > 0) {
      const orderClauses = orderBy.map(o => `${o.field} ${o.direction}`);
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    query += ` LIMIT $${paramCount + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Fetch examinations data
   */
  async fetchExaminationsData(filters, columns, aggregations, groupBy, orderBy, limit) {
    const { school_id, status, academic_year } = filters;

    let query = `
      SELECT ${columns.join(', ')}
      FROM academic.examinations
      WHERE school_id = $1 AND is_deleted = FALSE
    `;

    const params = [school_id];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (academic_year) {
      paramCount++;
      query += ` AND academic_year = $${paramCount}`;
      params.push(academic_year);
    }

    if (orderBy.length > 0) {
      const orderClauses = orderBy.map(o => `${o.field} ${o.direction}`);
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    query += ` LIMIT $${paramCount + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Fetch assignments data
   */
  async fetchAssignmentsData(filters, columns, aggregations, groupBy, orderBy, limit) {
    const { school_id, class: className, subject_id, status } = filters;

    let query = `
      SELECT ${columns.join(', ')}
      FROM academic.assignments
      WHERE school_id = $1 AND is_deleted = FALSE
    `;

    const params = [school_id];
    let paramCount = 1;

    if (className) {
      paramCount++;
      query += ` AND class = $${paramCount}`;
      params.push(className);
    }

    if (subject_id) {
      paramCount++;
      query += ` AND subject_id = $${paramCount}`;
      params.push(subject_id);
    }

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (orderBy.length > 0) {
      const orderClauses = orderBy.map(o => `${o.field} ${o.direction}`);
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    query += ` LIMIT $${paramCount + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Fetch students data
   */
  async fetchStudentsData(filters, columns, orderBy, limit) {
    const { school_id, class: className, section, status } = filters;

    let query = `
      SELECT ${columns.join(', ')}
      FROM sis_core.students
      WHERE school_id = $1
    `;

    const params = [school_id];
    let paramCount = 1;

    if (className) {
      paramCount++;
      query += ` AND class = $${paramCount}`;
      params.push(className);
    }

    if (section) {
      paramCount++;
      query += ` AND section = $${paramCount}`;
      params.push(section);
    }

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (orderBy.length > 0) {
      const orderClauses = orderBy.map(o => `${o.field} ${o.direction}`);
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    query += ` LIMIT $${paramCount + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Generate file in specified format
   */
  async generateFile(report, data, format, executionId) {
    const reportsDir = path.join(__dirname, '../../../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `${report.report_name.replace(/\s+/g, '_')}_${executionId}.${format}`;
    const filePath = path.join(reportsDir, filename);

    switch (format) {
      case 'pdf':
        await this.generatePDF(report, data, filePath);
        break;

      case 'excel':
        await this.generateExcel(report, data, filePath);
        break;

      case 'csv':
        await this.generateCSV(report, data, filePath);
        break;

      case 'json':
        await this.generateJSON(report, data, filePath);
        break;

      default:
        throw new ValidationError(`Unsupported output format: ${format}`);
    }

    return filePath;
  }

  /**
   * Generate PDF report
   */
  async generatePDF(report, data, filePath) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc.fontSize(20).text(report.report_name, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown();

      if (report.description) {
        doc.fontSize(10).text(report.description, { align: 'left' });
        doc.moveDown();
      }

      // Table
      if (data.length > 0) {
        const columns = Object.keys(data[0]);
        const columnWidth = (doc.page.width - 100) / columns.length;

        // Table header
        doc.fontSize(10).fillColor('black');
        let x = 50;
        columns.forEach(col => {
          doc.text(col, x, doc.y, { width: columnWidth, align: 'left' });
          x += columnWidth;
        });

        doc.moveDown();

        // Table rows
        data.forEach(row => {
          x = 50;
          columns.forEach(col => {
            const value = row[col] !== null && row[col] !== undefined ? String(row[col]) : '';
            doc.text(value, x, doc.y, { width: columnWidth, align: 'left' });
            x += columnWidth;
          });
          doc.moveDown(0.5);
        });
      } else {
        doc.text('No data available', { align: 'center' });
      }

      // Footer
      doc.fontSize(8).text(`Total records: ${data.length}`, 50, doc.page.height - 50, { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  /**
   * Generate Excel report
   */
  async generateExcel(report, data, filePath) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(report.report_name.substring(0, 31)); // Excel sheet name limit

    if (data.length > 0) {
      const columns = Object.keys(data[0]).map(key => ({
        header: key,
        key: key,
        width: 20
      }));

      worksheet.columns = columns;
      worksheet.addRows(data);

      // Style header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
    }

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  /**
   * Generate CSV report
   */
  async generateCSV(report, data, filePath) {
    if (data.length === 0) {
      fs.writeFileSync(filePath, 'No data available');
      return filePath;
    }

    const columns = Object.keys(data[0]);
    const csv = [
      columns.join(','),
      ...data.map(row => columns.map(col => {
        const value = row[col];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(','))
    ].join('\n');

    fs.writeFileSync(filePath, csv);
    return filePath;
  }

  /**
   * Generate JSON report
   */
  async generateJSON(report, data, filePath) {
    const output = {
      report_name: report.report_name,
      generated_at: new Date().toISOString(),
      total_records: data.length,
      data
    };

    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
    return filePath;
  }

  /**
   * Create execution record
   */
  async createExecution(reportId, parameters, executionType, executedBy = null) {
    const result = await pool.query(
      `INSERT INTO analytics.report_executions (
        report_id, execution_type, parameters, status, executed_by
      ) VALUES ($1, $2, $3, 'running', $4)
      RETURNING execution_id`,
      [reportId, executionType, JSON.stringify(parameters), executedBy]
    );

    return result.rows[0].execution_id;
  }

  /**
   * Update execution record
   */
  async updateExecution(executionId, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updateData)) {
      paramCount++;
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
    }

    paramCount++;
    fields.push(`completed_at = CURRENT_TIMESTAMP`);

    paramCount++;
    values.push(executionId);

    await pool.query(
      `UPDATE analytics.report_executions
       SET ${fields.join(', ')}
       WHERE execution_id = $${paramCount}`,
      values
    );
  }

  /**
   * Get report executions
   */
  async getReportExecutions(filters) {
    const { report_id, status, start_date, end_date, page = 1, limit = 20 } = filters;

    let query = `SELECT * FROM analytics.report_executions WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (report_id) {
      paramCount++;
      query += ` AND report_id = $${paramCount}`;
      params.push(report_id);
    }

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (start_date) {
      paramCount++;
      query += ` AND executed_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND executed_at <= $${paramCount}`;
      params.push(end_date);
    }

    // Count total
    const countResult = await pool.query(
      query.replace('SELECT *', 'SELECT COUNT(*)'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY executed_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return {
      executions: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = new ReportService();
