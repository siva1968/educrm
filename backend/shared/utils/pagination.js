/**
 * Pagination Utility
 * Provides consistent pagination across all services
 */

/**
 * Calculate pagination metadata
 * @param {number} page - Current page number (1-indexed)
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Pagination metadata
 */
const getPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const currentPage = parseInt(page);
  const itemsPerPage = parseInt(limit);

  return {
    page: currentPage,
    limit: itemsPerPage,
    total: parseInt(total),
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null
  };
};

/**
 * Calculate offset for SQL queries
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {number} Offset value
 */
const getOffset = (page, limit) => {
  return (parseInt(page) - 1) * parseInt(limit);
};

/**
 * Paginate array (for in-memory data)
 * @param {Array} array - Data array
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Paginated data with metadata
 */
const paginateArray = (array, page = 1, limit = 50) => {
  const offset = getOffset(page, limit);
  const paginatedData = array.slice(offset, offset + parseInt(limit));

  return {
    data: paginatedData,
    pagination: getPaginationMeta(page, limit, array.length)
  };
};

/**
 * Build pagination SQL clause
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {string} SQL LIMIT and OFFSET clause
 */
const getPaginationSQL = (page, limit) => {
  const offset = getOffset(page, limit);
  return `LIMIT ${parseInt(limit)} OFFSET ${offset}`;
};

/**
 * Middleware to parse and validate pagination params
 * Adds pagination object to req
 */
const paginationMiddleware = (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(
    parseInt(req.query.limit) || parseInt(process.env.DEFAULT_PAGE_SIZE) || 50,
    parseInt(process.env.MAX_PAGE_SIZE) || 200
  );

  req.pagination = {
    page,
    limit,
    offset: getOffset(page, limit)
  };

  next();
};

/**
 * Format paginated response
 * @param {Array} data - Data array
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {number} total - Total count
 * @param {Object} additional - Additional response fields
 * @returns {Object} Formatted response
 */
const formatPaginatedResponse = (data, page, limit, total, additional = {}) => {
  return {
    success: true,
    data,
    pagination: getPaginationMeta(page, limit, total),
    ...additional
  };
};

module.exports = {
  getPaginationMeta,
  getOffset,
  paginateArray,
  getPaginationSQL,
  paginationMiddleware,
  formatPaginatedResponse
};
