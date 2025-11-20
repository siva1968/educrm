const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Request Logging Middleware
 * Logs all HTTP requests with timing and metadata
 */

const requestLogger = (serviceName) => {
  return (req, res, next) => {
    const start = Date.now();

    // Add request ID for correlation
    req.id = req.headers['x-request-id'] || uuidv4();
    res.setHeader('X-Request-ID', req.id);

    // Create child logger with request context
    req.logger = logger.child({
      requestId: req.id,
      service: serviceName,
    });

    // Log request start
    req.logger.http('Incoming request', {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
      res.send = originalSend;
      res.responseBody = data;
      return res.send(data);
    };

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';

      req.logger[logLevel]('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('content-length'),
      });

      // Log errors in detail
      if (res.statusCode >= 500) {
        req.logger.error('Server error occurred', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          body: req.body,
          query: req.query,
          params: req.params,
        });
      }
    });

    next();
  };
};

/**
 * Error Logging Middleware
 * Logs detailed error information
 */
const errorLogger = (err, req, res, next) => {
  const logger = req.logger || logger;

  logger.logError(err, {
    requestId: req.id,
    method: req.method,
    url: req.url,
    body: req.body,
    query: req.query,
    params: req.params,
    user: req.user?.id,
  });

  next(err);
};

module.exports = {
  requestLogger,
  errorLogger,
};
