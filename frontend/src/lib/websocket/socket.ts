/**
 * WebSocket Client for Frontend
 * Socket.io client with React hooks
 */

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export interface SocketConfig {
  url?: string;
  token?: string;
  autoConnect?: boolean;
}

/**
 * Initialize WebSocket connection
 */
export function initializeSocket(config: SocketConfig = {}): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000',
    token = '',
    autoConnect = true,
  } = config;

  socket = io(url, {
    auth: {
      token,
    },
    autoConnect,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ['websocket', 'polling'],
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('WebSocket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
  });

  return socket;
}

/**
 * Get current socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Emit event to server
 */
export function emit(event: string, data?: any): void {
  if (socket && socket.connected) {
    socket.emit(event, data);
  } else {
    console.warn('Socket not connected. Cannot emit event:', event);
  }
}

/**
 * Join a room
 */
export function joinRoom(roomId: string): void {
  emit('joinRoom', roomId);
}

/**
 * Leave a room
 */
export function leaveRoom(roomId: string): void {
  emit('leaveRoom', roomId);
}

/**
 * Subscribe to event
 */
export function on(event: string, callback: (...args: any[]) => void): void {
  if (socket) {
    socket.on(event, callback);
  }
}

/**
 * Unsubscribe from event
 */
export function off(event: string, callback?: (...args: any[]) => void): void {
  if (socket) {
    if (callback) {
      socket.off(event, callback);
    } else {
      socket.off(event);
    }
  }
}

/**
 * Subscribe to event once
 */
export function once(event: string, callback: (...args: any[]) => void): void {
  if (socket) {
    socket.once(event, callback);
  }
}

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  emit,
  joinRoom,
  leaveRoom,
  on,
  off,
  once,
};
