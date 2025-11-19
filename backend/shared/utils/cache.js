const redis = require('redis');
const { promisify } = require('util');

/**
 * Caching Utility
 * Redis-based caching for improved performance
 */

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;

    // Only initialize if caching is enabled
    if (process.env.CACHE_ENABLED === 'true' && process.env.REDIS_HOST) {
      this.initialize();
    }
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('Redis connection refused');
            return new Error('Redis server refused connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined; // Stop retrying
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      // Promisify Redis methods
      this.getAsync = promisify(this.client.get).bind(this.client);
      this.setAsync = promisify(this.client.set).bind(this.client);
      this.delAsync = promisify(this.client.del).bind(this.client);
      this.existsAsync = promisify(this.client.exists).bind(this.client);
      this.expireAsync = promisify(this.client.expire).bind(this.client);
      this.keysAsync = promisify(this.client.keys).bind(this.client);

      this.client.on('connect', () => {
        console.log('✓ Redis cache connected');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('Redis cache error:', err);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('Redis cache connection closed');
        this.isConnected = false;
      });

    } catch (error) {
      console.error('Failed to initialize cache:', error);
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    if (!this.isConnected) return null;

    try {
      const value = await this.getAsync(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default from env)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = null) {
    if (!this.isConnected) return false;

    try {
      const ttlSeconds = ttl || parseInt(process.env.CACHE_TTL_SECONDS) || 300;
      const serialized = JSON.stringify(value);
      await this.setAsync(key, serialized, 'EX', ttlSeconds);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    if (!this.isConnected) return false;

    try {
      await this.delAsync(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete keys matching pattern
   * @param {string} pattern - Key pattern (e.g., 'user:*')
   * @returns {Promise<number>} Number of keys deleted
   */
  async delPattern(pattern) {
    if (!this.isConnected) return 0;

    try {
      const keys = await this.keysAsync(pattern);
      if (keys.length === 0) return 0;

      await this.delAsync(...keys);
      return keys.length;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Existence status
   */
  async exists(key) {
    if (!this.isConnected) return false;

    try {
      const result = await this.existsAsync(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Cache middleware factory
   * Automatically caches GET request responses
   * @param {number} ttl - Cache TTL in seconds
   * @returns {Function} Express middleware
   */
  cacheMiddleware(ttl = 300) {
    return async (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Generate cache key from URL and query params
      const cacheKey = `cache:${req.originalUrl || req.url}`;

      try {
        // Try to get from cache
        const cachedData = await this.get(cacheKey);

        if (cachedData) {
          // Cache hit
          return res.json({
            ...cachedData,
            _cached: true,
            _cachedAt: new Date().toISOString()
          });
        }

        // Cache miss - intercept res.json to cache the response
        const originalJson = res.json.bind(res);

        res.json = (data) => {
          // Cache the response
          this.set(cacheKey, data, ttl).catch(err => {
            console.error('Failed to cache response:', err);
          });

          // Send the response
          return originalJson(data);
        };

        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Invalidate cache for a resource
   * @param {string} resource - Resource name (e.g., 'students', 'fees')
   * @returns {Promise<number>} Number of keys invalidated
   */
  async invalidateResource(resource) {
    return this.delPattern(`cache:*${resource}*`);
  }

  /**
   * Close Redis connection
   */
  close() {
    if (this.client) {
      this.client.quit();
    }
  }
}

// Export singleton instance
module.exports = new CacheService();
