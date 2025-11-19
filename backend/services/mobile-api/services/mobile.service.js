const axios = require('axios');
const Redis = require('redis');
const { v4: uuidv4 } = require('uuid');

/**
 * Mobile API Service
 * Provides mobile-optimized endpoints with offline sync, caching, and data optimization
 */
class MobileService {
  constructor() {
    this.redisClient = null;
    this.syncQueue = new Map();
    this.initializeRedis();
  }

  /**
   * Initialize Redis client for caching
   */
  async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redisClient = Redis.createClient({
          url: process.env.REDIS_URL
        });

        this.redisClient.on('error', (err) => console.error('Redis error:', err));
        await this.redisClient.connect();
        console.log('✓ Mobile API: Redis connected');
      }
    } catch (error) {
      console.warn('⚠ Mobile API: Redis not available, using in-memory cache');
    }
  }

  // =============================================
  // DATA OPTIMIZATION
  // =============================================

  /**
   * Get optimized student dashboard data
   * Returns minimal payload optimized for mobile
   */
  async getStudentDashboard(studentId) {
    const cacheKey = `mobile:dashboard:${studentId}`;

    // Try cache first
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // Fetch from microservices
    const data = {
      profile: await this.fetchStudentProfile(studentId),
      upcomingClasses: await this.fetchUpcomingClasses(studentId, 5),
      recentGrades: await this.fetchRecentGrades(studentId, 10),
      pendingAssignments: await this.fetchPendingAssignments(studentId),
      notifications: await this.fetchNotifications(studentId, 10),
      attendance: await this.fetchAttendanceSummary(studentId)
    };

    // Cache for 5 minutes
    await this.setCache(cacheKey, data, 300);

    return data;
  }

  /**
   * Get optimized teacher dashboard
   */
  async getTeacherDashboard(teacherId) {
    const cacheKey = `mobile:teacher:dashboard:${teacherId}`;

    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    const data = {
      profile: await this.fetchTeacherProfile(teacherId),
      todayClasses: await this.fetchTodayClasses(teacherId),
      pendingGrading: await this.fetchPendingGrading(teacherId),
      recentSubmissions: await this.fetchRecentSubmissions(teacherId, 10),
      classAttendance: await this.fetchClassAttendanceSummary(teacherId),
      notifications: await this.fetchNotifications(teacherId, 10)
    };

    await this.setCache(cacheKey, data, 300);
    return data;
  }

  // =============================================
  // OFFLINE SYNC
  // =============================================

  /**
   * Queue offline actions for sync
   */
  async queueOfflineAction(userId, action) {
    const syncId = uuidv4();
    const syncItem = {
      syncId,
      userId,
      action: action.type,
      data: action.data,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retries: 0
    };

    this.syncQueue.set(syncId, syncItem);

    // Persist to Redis if available
    if (this.redisClient) {
      await this.redisClient.lPush(`sync:queue:${userId}`, JSON.stringify(syncItem));
    }

    return { syncId, queued: true };
  }

  /**
   * Process offline sync queue
   */
  async processSyncQueue(userId) {
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      items: []
    };

    // Get queue from Redis
    if (this.redisClient) {
      const queueItems = await this.redisClient.lRange(`sync:queue:${userId}`, 0, -1);

      for (const itemStr of queueItems) {
        const item = JSON.parse(itemStr);
        results.total++;

        try {
          await this.executeSyncAction(item);
          results.successful++;
          results.items.push({
            syncId: item.syncId,
            action: item.action,
            status: 'synced'
          });

          // Remove from queue
          await this.redisClient.lRem(`sync:queue:${userId}`, 1, itemStr);
        } catch (error) {
          results.failed++;
          results.items.push({
            syncId: item.syncId,
            action: item.action,
            status: 'failed',
            error: error.message
          });
        }
      }
    }

    return results;
  }

  /**
   * Execute a sync action
   */
  async executeSyncAction(syncItem) {
    switch (syncItem.action) {
      case 'submit_assignment':
        return await this.submitAssignment(syncItem.data);
      case 'mark_attendance':
        return await this.markAttendance(syncItem.data);
      case 'post_comment':
        return await this.postComment(syncItem.data);
      case 'update_profile':
        return await this.updateProfile(syncItem.data);
      default:
        throw new Error(`Unknown sync action: ${syncItem.action}`);
    }
  }

  // =============================================
  // OPTIMIZED DATA FETCHING
  // =============================================

  /**
   * Fetch student profile (optimized)
   */
  async fetchStudentProfile(studentId) {
    // Mock implementation - replace with actual API calls
    return {
      id: studentId,
      name: 'Student Name',
      class: '10th Grade',
      section: 'A',
      avatar: '/avatars/default.jpg'
    };
  }

  /**
   * Fetch upcoming classes
   */
  async fetchUpcomingClasses(studentId, limit = 5) {
    return [
      {
        id: '1',
        subject: 'Mathematics',
        teacher: 'Mr. Smith',
        time: '09:00 AM',
        room: '101'
      }
    ];
  }

  /**
   * Fetch recent grades
   */
  async fetchRecentGrades(studentId, limit = 10) {
    return [
      {
        id: '1',
        subject: 'Mathematics',
        assignment: 'Chapter 5 Test',
        grade: 'A',
        score: 95,
        date: '2025-11-15'
      }
    ];
  }

  /**
   * Fetch pending assignments
   */
  async fetchPendingAssignments(studentId) {
    return [
      {
        id: '1',
        subject: 'English',
        title: 'Essay on Climate Change',
        dueDate: '2025-11-25',
        points: 100
      }
    ];
  }

  /**
   * Fetch notifications
   */
  async fetchNotifications(userId, limit = 10) {
    return [
      {
        id: '1',
        type: 'grade_posted',
        title: 'New Grade Posted',
        message: 'Your Mathematics test has been graded',
        timestamp: '2025-11-19T10:30:00Z',
        read: false
      }
    ];
  }

  /**
   * Fetch attendance summary
   */
  async fetchAttendanceSummary(studentId) {
    return {
      present: 85,
      absent: 5,
      late: 3,
      percentage: 91.4
    };
  }

  // Teacher-specific methods
  async fetchTeacherProfile(teacherId) {
    return {
      id: teacherId,
      name: 'Teacher Name',
      department: 'Mathematics',
      avatar: '/avatars/teacher.jpg'
    };
  }

  async fetchTodayClasses(teacherId) {
    return [
      {
        id: '1',
        class: '10th Grade A',
        subject: 'Mathematics',
        time: '09:00 AM',
        room: '101',
        attendance: { present: 25, total: 30 }
      }
    ];
  }

  async fetchPendingGrading(teacherId) {
    return {
      count: 15,
      assignments: [
        {
          id: '1',
          title: 'Chapter 5 Test',
          class: '10th Grade A',
          submitted: 28,
          total: 30
        }
      ]
    };
  }

  async fetchRecentSubmissions(teacherId, limit) {
    return [];
  }

  async fetchClassAttendanceSummary(teacherId) {
    return {
      todayAverage: 92.5,
      weekAverage: 90.3
    };
  }

  // =============================================
  // ACTION METHODS
  // =============================================

  async submitAssignment(data) {
    // Mock implementation
    return { success: true, submissionId: uuidv4() };
  }

  async markAttendance(data) {
    return { success: true };
  }

  async postComment(data) {
    return { success: true, commentId: uuidv4() };
  }

  async updateProfile(data) {
    return { success: true };
  }

  // =============================================
  // CACHE METHODS
  // =============================================

  async getCache(key) {
    if (!this.redisClient) return null;

    try {
      const data = await this.redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  async setCache(key, value, ttl = 300) {
    if (!this.redisClient) return;

    try {
      await this.redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error.message);
    }
  }

  async invalidateCache(pattern) {
    if (!this.redisClient) return;

    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error.message);
    }
  }

  // =============================================
  // BATCH OPERATIONS
  // =============================================

  /**
   * Batch fetch multiple resources
   */
  async batchFetch(requests) {
    const results = {};

    for (const request of requests) {
      try {
        switch (request.resource) {
          case 'grades':
            results.grades = await this.fetchRecentGrades(request.id, request.limit);
            break;
          case 'assignments':
            results.assignments = await this.fetchPendingAssignments(request.id);
            break;
          case 'notifications':
            results.notifications = await this.fetchNotifications(request.id, request.limit);
            break;
          default:
            results[request.resource] = null;
        }
      } catch (error) {
        results[request.resource] = { error: error.message };
      }
    }

    return results;
  }

  // =============================================
  // DEVICE MANAGEMENT
  // =============================================

  /**
   * Register mobile device for push notifications
   */
  async registerDevice(userId, deviceInfo) {
    const deviceId = uuidv4();

    // Store device info
    if (this.redisClient) {
      await this.redisClient.hSet(`devices:${userId}`, deviceId, JSON.stringify(deviceInfo));
    }

    return {
      deviceId,
      registered: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Unregister device
   */
  async unregisterDevice(userId, deviceId) {
    if (this.redisClient) {
      await this.redisClient.hDel(`devices:${userId}`, deviceId);
    }

    return { unregistered: true };
  }

  /**
   * Get user devices
   */
  async getUserDevices(userId) {
    if (!this.redisClient) return [];

    try {
      const devices = await this.redisClient.hGetAll(`devices:${userId}`);
      return Object.entries(devices).map(([deviceId, info]) => ({
        deviceId,
        ...JSON.parse(info)
      }));
    } catch (error) {
      return [];
    }
  }
}

module.exports = new MobileService();
