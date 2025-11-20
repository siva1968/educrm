const promClient = require('prom-client');

/**
 * Prometheus Metrics Middleware
 * Production-ready monitoring and observability
 */

// Create a Registry to register metrics
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'educrm_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// Custom Metrics

// HTTP Request Duration
const httpRequestDuration = new promClient.Histogram({
  name: 'educrm_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// HTTP Request Total
const httpRequestTotal = new promClient.Counter({
  name: 'educrm_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register],
});

// Active Connections
const activeConnections = new promClient.Gauge({
  name: 'educrm_active_connections',
  help: 'Number of active connections',
  labelNames: ['service'],
  registers: [register],
});

// Database Query Duration
const dbQueryDuration = new promClient.Histogram({
  name: 'educrm_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table', 'service'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

// Database Query Total
const dbQueryTotal = new promClient.Counter({
  name: 'educrm_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status', 'service'],
  registers: [register],
});

// Cache Hit/Miss
const cacheHits = new promClient.Counter({
  name: 'educrm_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_name', 'service'],
  registers: [register],
});

const cacheMisses = new promClient.Counter({
  name: 'educrm_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_name', 'service'],
  registers: [register],
});

// Business Metrics
const studentsCreated = new promClient.Counter({
  name: 'educrm_students_created_total',
  help: 'Total number of students created',
  labelNames: ['school_id', 'service'],
  registers: [register],
});

const attendanceMarked = new promClient.Counter({
  name: 'educrm_attendance_marked_total',
  help: 'Total attendance records marked',
  labelNames: ['status', 'school_id', 'service'],
  registers: [register],
});

const feesCollected = new promClient.Counter({
  name: 'educrm_fees_collected_total',
  help: 'Total fees collected',
  labelNames: ['school_id', 'service'],
  registers: [register],
});

const feesCollectedAmount = new promClient.Gauge({
  name: 'educrm_fees_collected_amount',
  help: 'Total amount of fees collected',
  labelNames: ['school_id', 'service'],
  registers: [register],
});

// Middleware to track HTTP metrics
const metricsMiddleware = (serviceName) => {
  return (req, res, next) => {
    const start = Date.now();

    // Increment active connections
    activeConnections.inc({ service: serviceName });

    // Track request completion
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000; // Convert to seconds
      const route = req.route ? req.route.path : req.path;

      // Record metrics
      httpRequestDuration.observe(
        {
          method: req.method,
          route,
          status_code: res.statusCode,
          service: serviceName,
        },
        duration
      );

      httpRequestTotal.inc({
        method: req.method,
        route,
        status_code: res.statusCode,
        service: serviceName,
      });

      // Decrement active connections
      activeConnections.dec({ service: serviceName });
    });

    next();
  };
};

// Metrics endpoint
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
};

// Health check endpoint
const healthCheckEndpoint = (serviceName) => {
  return async (req, res) => {
    const healthcheck = {
      service: serviceName,
      uptime: process.uptime(),
      timestamp: Date.now(),
      status: 'OK',
      checks: {},
    };

    // Add memory usage
    const memUsage = process.memoryUsage();
    healthcheck.checks.memory = {
      status: 'OK',
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    };

    // Add CPU usage
    const cpuUsage = process.cpuUsage();
    healthcheck.checks.cpu = {
      status: 'OK',
      user: cpuUsage.user,
      system: cpuUsage.system,
    };

    res.status(200).json(healthcheck);
  };
};

module.exports = {
  register,
  metricsMiddleware,
  metricsEndpoint,
  healthCheckEndpoint,
  metrics: {
    httpRequestDuration,
    httpRequestTotal,
    activeConnections,
    dbQueryDuration,
    dbQueryTotal,
    cacheHits,
    cacheMisses,
    studentsCreated,
    attendanceMarked,
    feesCollected,
    feesCollectedAmount,
  },
};
