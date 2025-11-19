const { query } = require('../../../shared/config/database');
const cache = require('../../../shared/utils/cache');
const { v4: uuidv4 } = require('uuid');

class GradebookServiceService {
  /**
   * Get all records with pagination and filtering
   */
  async getAll(filters = {}, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const conditions = ['deleted_at IS NULL'];
    const values = [];
    let paramCount = 1;

    // Apply filters
    if (filters.status) {
      conditions.push(`status = $${paramCount}`);
      values.push(filters.status);
      paramCount++;
    }

    if (filters.search) {
      conditions.push(`(name ILIKE $${paramCount})`);
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    // Build queries
    const whereClause = conditions.join(' AND ');
    const countSql = `SELECT COUNT(*) FROM gradebook_services WHERE ${whereClause}`;
    const dataSql = `
      SELECT * FROM gradebook_services
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    // Execute queries
    const countResult = await query(countSql, values);
    const dataResult = await query(dataSql, [...values, limit, offset]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }

  /**
   * Get record by ID with caching
   */
  async getById(id) {
    const cacheKey = `gradebookService:${id}`;

    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const sql = `
      SELECT * FROM gradebook_services
      WHERE id = $1 AND deleted_at IS NULL
    `;

    const result = await query(sql, [id]);
    const record = result.rows[0] || null;

    // Cache result
    if (record) {
      await cache.set(cacheKey, record, 300); // 5 minutes
    }

    return record;
  }

  /**
   * Create new record
   */
  async create(data) {
    const id = uuidv4();

    const sql = `
      INSERT INTO gradebook_services (id, name, status, created_at, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [id, data.name, data.status || 'active'];

    const result = await query(sql, values);
    const record = result.rows[0];

    // Invalidate list cache
    await cache.invalidateResource('gradebookService');

    return record;
  }

  /**
   * Update record
   */
  async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic update
    const allowedFields = ['name', 'status'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(data[field]);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const sql = `
      UPDATE gradebook_services
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      throw new Error('Record not found');
    }

    const record = result.rows[0];

    // Invalidate caches
    await cache.del(`gradebookService:${id}`);
    await cache.invalidateResource('gradebookService');

    return record;
  }

  /**
   * Soft delete record
   */
  async delete(id) {
    const sql = `
      UPDATE gradebook_services
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      throw new Error('Record not found');
    }

    // Invalidate caches
    await cache.del(`gradebookService:${id}`);
    await cache.invalidateResource('gradebookService');

    return true;
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    const sql = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive
      FROM gradebook_services
      WHERE deleted_at IS NULL
    `;

    const result = await query(sql);
    return result.rows[0];
  }
}

module.exports = new GradebookServiceService();
