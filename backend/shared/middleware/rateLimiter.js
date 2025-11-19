const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

/**
 * Rate Limiting Middleware
 * Protects APIs from abuse and DDoS attacks
 */

// Create Redis client for distributed rate limiting
let redisClient;
if (process.env.REDIS_HOST && process.env.RATE_LIMIT_ENABLED === 'true') {
  redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  });
}

/**
 * Standard rate limiter (100 requests per 15 minutes)
 */
const standardLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Use Redis store if available for distributed rate limiting
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:standard:'
  }) : undefined,
  // Skip rate limiting for certain IPs (like health checks)
  skip: (req) => {
    const skipIPs = (process.env.RATE_LIMIT_SKIP_IPS || '').split(',');
    return skipIPs.includes(req.ip);
  }
});

/**
 * Strict rate limiter for sensitive operations (20 requests per 15 minutes)
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:strict:'
  }) : undefined
});

/**
 * Login rate limiter (5 attempts per 15 minutes)
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:login:'
  }) : undefined
});

/**
 * API creation rate limiter (30 creates per hour)
 */
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: {
    success: false,
    message: 'Too many records created. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:create:'
  }) : undefined
});

/**
 * Mobile API rate limiter (500 requests per 15 minutes)
 */
const mobileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.MOBILE_API_RATE_LIMIT) || 500,
  message: {
    success: false,
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:mobile:'
  }) : undefined
});

/**
 * Custom rate limiter factory
 * @param {Object} options - Rate limit options
 * @returns {Function} Express middleware
 */
const createRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
  };

  const config = { ...defaults, ...options };

  if (redisClient && !config.store) {
    config.store = new RedisStore({
      client: redisClient,
      prefix: config.prefix || 'rl:custom:'
    });
  }

  return rateLimit(config);
};

module.exports = {
  standardLimiter,
  strictLimiter,
  loginLimiter,
  createLimiter,
  mobileLimiter,
  createRateLimiter
};
