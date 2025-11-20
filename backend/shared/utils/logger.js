const winston = require('winston');
const path = require('path');

/**
 * Production-Ready Centralized Logger
 * Features:
 * - JSON format for production (ELK/Grafana Loki compatible)
 * - Colorized console for development
 * - Service name and metadata tracking
 * - Request ID correlation
 * - Error stack traces
 * - Multiple log levels
 */

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors for console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Get environment
const env = process.env.NODE_ENV || 'development';
const isDevelopment = env === 'development';
const serviceName = process.env.SERVICE_NAME || 'educrm-service';
const logDir = process.env.LOG_DIR || './logs';

// Development format - colorized and readable
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, requestId, ...meta } = info;
    let log = `${timestamp} [${service || serviceName}] ${level}: ${message}`;

    if (requestId) {
      log += ` [reqId: ${requestId}]`;
    }

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return log;
  })
);

// Production format - JSON for log aggregation
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Choose format based on environment
const logFormat = isDevelopment ? devFormat : prodFormat;

// Define transports
const transports = [];

// Console transport - always enabled
transports.push(
  new winston.transports.Console({
    format: isDevelopment ? devFormat : winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  })
);

// File transports - only in production or if explicitly enabled
if (!isDevelopment || process.env.ENABLE_FILE_LOGS === 'true') {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );

  // HTTP log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'http.log'),
      level: 'http',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 3,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : process.env.LOG_LEVEL || 'info',
  levels,
  format: logFormat,
  defaultMeta: {
    service: serviceName,
    environment: env,
    hostname: require('os').hostname(),
    pid: process.pid,
  },
  transports,
  exitOnError: false,
});

// Add request logging helper
logger.logRequest = (req, res, duration) => {
  logger.http('HTTP Request', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    requestId: req.id || req.headers['x-request-id'],
  });
};

// Add error logging helper with context
logger.logError = (error, context = {}) => {
  logger.error(error.message || 'Unknown error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
    ...context,
  });
};

// Add child logger factory for service-specific loggers
logger.child = (metadata) => {
  return logger.child({ ...metadata });
};

// Stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Log unhandled errors
if (!isDevelopment) {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at Promise', {
      promise,
      reason: reason instanceof Error ? {
        message: reason.message,
        stack: reason.stack,
      } : reason,
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
    // Give logger time to write before exiting
    setTimeout(() => process.exit(1), 1000);
  });
}

module.exports = logger;
