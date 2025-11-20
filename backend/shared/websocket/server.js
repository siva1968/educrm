/**
 * WebSocket Server Setup
 * Real-time communication using Socket.io
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class WebSocketServer {
  constructor(httpServer, options = {}) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      ...options,
    });

    this.connectedUsers = new Map(); // userId -> Set of socket IDs
    this.socketToUser = new Map(); // socketId -> userId
    this.rooms = new Map(); // roomId -> Set of socket IDs

    this.setupMiddleware();
    this.setupConnectionHandlers();
    
    logger.info('WebSocket server initialized');
  }

  /**
   * Setup authentication middleware
   */
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.schoolId = decoded.schoolId;
        
        logger.debug('WebSocket authentication successful', {
          userId: socket.userId,
          socketId: socket.id,
        });

        next();
      } catch (error) {
        logger.error('WebSocket authentication failed', {
          error: error.message,
          socketId: socket.id,
        });
        next(new Error('Invalid token'));
      }
    });
  }

  /**
   * Setup connection event handlers
   */
  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      logger.info('Client connected', {
        userId: socket.userId,
        socketId: socket.id,
        schoolId: socket.schoolId,
      });

      // Track connected user
      this.trackConnection(socket);

      // Join user to their personal room
      socket.join('user:' + socket.userId);
      
      // Join school room
      if (socket.schoolId) {
        socket.join('school:' + socket.schoolId);
      }

      // Setup event handlers
      this.setupEventHandlers(socket);

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info('Client disconnected', {
          userId: socket.userId,
          socketId: socket.id,
          reason,
        });
        this.untrackConnection(socket);
      });

      // Send welcome message
      socket.emit('connected', {
        socketId: socket.id,
        timestamp: new Date(),
      });
    });
  }

  /**
   * Setup custom event handlers
   */
  setupEventHandlers(socket) {
    // Ping/Pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Join custom room
    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      this.rooms.set(roomId, (this.rooms.get(roomId) || new Set()).add(socket.id));
      logger.debug('Socket joined room', { socketId: socket.id, roomId });
      socket.emit('roomJoined', { roomId });
    });

    // Leave custom room
    socket.on('leaveRoom', (roomId) => {
      socket.leave(roomId);
      const roomSockets = this.rooms.get(roomId);
      if (roomSockets) {
        roomSockets.delete(socket.id);
        if (roomSockets.size === 0) {
          this.rooms.delete(roomId);
        }
      }
      logger.debug('Socket left room', { socketId: socket.id, roomId });
      socket.emit('roomLeft', { roomId });
    });

    // Typing indicator
    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('userTyping', {
        userId: socket.userId,
        isTyping,
        roomId,
      });
    });

    // Real-time notifications
    socket.on('notification:read', ({ notificationId }) => {
      socket.emit('notification:updated', {
        notificationId,
        read: true,
      });
    });
  }

  /**
   * Track user connection
   */
  trackConnection(socket) {
    // Add to connected users
    if (!this.connectedUsers.has(socket.userId)) {
      this.connectedUsers.set(socket.userId, new Set());
    }
    this.connectedUsers.get(socket.userId).add(socket.id);
    
    // Map socket to user
    this.socketToUser.set(socket.id, socket.userId);

    // Emit user online status
    this.emitToSchool(socket.schoolId, 'user:online', {
      userId: socket.userId,
      timestamp: new Date(),
    });
  }

  /**
   * Untrack user connection
   */
  untrackConnection(socket) {
    const userId = this.socketToUser.get(socket.id);
    
    if (userId) {
      const userSockets = this.connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        
        // If user has no more connections, mark as offline
        if (userSockets.size === 0) {
          this.connectedUsers.delete(userId);
          this.emitToSchool(socket.schoolId, 'user:offline', {
            userId,
            timestamp: new Date(),
          });
        }
      }
    }
    
    this.socketToUser.delete(socket.id);
  }

  /**
   * Emit event to specific user
   */
  emitToUser(userId, event, data) {
    this.io.to('user:' + userId).emit(event, data);
  }

  /**
   * Emit event to specific school
   */
  emitToSchool(schoolId, event, data) {
    this.io.to('school:' + schoolId).emit(event, data);
  }

  /**
   * Emit event to specific room
   */
  emitToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get user's socket count
   */
  getUserSocketCount(userId) {
    const sockets = this.connectedUsers.get(userId);
    return sockets ? sockets.size : 0;
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalSockets: this.socketToUser.size,
      activeRooms: this.rooms.size,
      timestamp: new Date(),
    };
  }
}

module.exports = WebSocketServer;
