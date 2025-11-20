const { Pool } = require('pg');
const {  createClient } = require('redis');

/**
 * Redis Cache Service (Updated for Redis v4+)
 * Modern Redis client with automatic connection management
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
   * Initialize Redis connection with v4+ API
   */
  async initialize() {
    try {
      this.client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis max retry attempts reached');
              return new Error('Max retry attempts reached');
            }
            // Exponential backoff: 100ms, 200ms, 400ms, 800ms, etc.
            const delay = Math.min(retries * 100, 3000);
            console.log(`Retrying Redis connection in ${delay}ms...`);
            return delay;
          }
        },
        password: process.env.REDIS_PASSWORD,
        database: parseInt(process.env.REDIS_DB) || 0,
      });

      this.client.on('connect', () => {
        console.log('✓ Redis cache connecting...');
      });

      this.client.on('ready', () => {
        console.log('✓ Redis cache ready');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('Redis cache error:', err.message);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('Redis cache connection closed');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();

    } catch (error) {
      console.error('Failed to initialize cache:', error);
      this.isConnected = false;
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
      const value = await this.client.get(key);
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
      await this.client.setEx(key, ttlSeconds, serialized);
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
      await this.client.del(key);
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
      const keys = [];
      for await (const key of this.client.scanIterator({ MATCH: pattern })) {
        keys.push(key);
      }

      if (keys.length === 0) return 0;

      await this.client.del(keys);
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
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Set expiration on existing key
   * @param {string} key - Cache key
   * @param {number} seconds - Expiration in seconds
   * @returns {Promise<boolean>} Success status
   */
  async expire(key, seconds) {
    if (!this.isConnected) return false;

    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} Remaining TTL in seconds, -1 if no expire, -2 if not exists
   */
  async ttl(key) {
    if (!this.isConnected) return -2;

    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error('Cache TTL error:', error);
      return -2;
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
   * Flush all cache
   * WARNING: This will clear all cached data
   * @returns {Promise<boolean>} Success status
   */
  async flushAll() {
    if (!this.isConnected) return false;

    try {
      await this.client.flushDb();
      console.log('✓ Cache flushed');
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      console.log('✓ Redis connection closed');
    }
  }

  /**
   * Health check
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    if (!this.isConnected) {
      return { healthy: false, message: 'Redis not connected' };
    }

    try {
      await this.client.ping();
      return { healthy: true, message: 'Redis connected' };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }
}

// Export singleton instance
module.exports = new CacheService();
