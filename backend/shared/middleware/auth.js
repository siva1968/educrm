const jwt = require('jsonwebtoken');
const ApiResponse = require('../utils/response');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */

/**
 * Main authentication middleware
 * Validates JWT token from Authorization header
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
        error: 'NO_TOKEN'
      });
    }

    // Check for Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format. Use: Authorization: Bearer <token>',
        error: 'INVALID_TOKEN_FORMAT'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');

    // Attach user info to request
    req.user = {
      userId: decoded.userId || decoded.user_id,
      email: decoded.email,
      role: decoded.role,
      schoolId: decoded.schoolId || decoded.school_id,
      name: decoded.name
    };

    // Validate required fields
    if (!req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token: missing user ID',
        error: 'INVALID_TOKEN_PAYLOAD'
      });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
        error: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Authentication failed.',
        error: 'INVALID_TOKEN'
      });
    }

    // Generic error
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      req.user = null;
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');

    req.user = {
      userId: decoded.userId || decoded.user_id,
      email: decoded.email,
      role: decoded.role,
      schoolId: decoded.schoolId || decoded.school_id,
      name: decoded.name
    };

    next();
  } catch (error) {
    // Token invalid but optional, continue without user
    req.user = null;
    next();
  }
};

/**
 * Role-based authorization middleware
 * Checks if user has required role
 *
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {Function} Middleware function
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden. Required roles: ${allowedRoles.join(', ')}`,
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * School isolation middleware
 * Ensures user can only access data from their school
 *
 * @param {string} paramName - Name of the school_id parameter (default: 'school_id')
 * @returns {Function} Middleware function
 */
const enforceSchoolIsolation = (paramName = 'school_id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED'
      });
    }

    // Allow system admins to bypass school isolation
    if (req.user.role === 'system_admin' || req.user.role === 'super_admin') {
      return next();
    }

    // Get school_id from body, query, or params
    const requestedSchoolId = req.body[paramName] || req.query[paramName] || req.params[paramName];

    if (!requestedSchoolId) {
      // If no school_id in request, inject user's school_id
      if (req.body && Object.keys(req.body).length > 0) {
        req.body[paramName] = req.user.schoolId;
      }
      if (req.query && Object.keys(req.query).length > 0) {
        req.query[paramName] = req.user.schoolId;
      }
      return next();
    }

    // Verify school_id matches user's school
    if (requestedSchoolId !== req.user.schoolId) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. You can only access data from your school.',
        error: 'SCHOOL_ISOLATION_VIOLATION'
      });
    }

    next();
  };
};

/**
 * Generate JWT token
 * Utility function to create tokens
 *
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Expiration time (default: '24h')
 * @returns {string} JWT token
 */
const generateToken = (payload, expiresIn = '24h') => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key-change-in-production', {
    expiresIn
  });
};

/**
 * Verify token
 * Utility function to verify tokens
 *
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  enforceSchoolIsolation,
  generateToken,
  verifyToken
};
