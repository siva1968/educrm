/**
 * React Hooks for WebSocket
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { initializeSocket, getSocket, disconnectSocket, emit, on, off } from './socket';

/**
 * Hook to initialize and manage socket connection
 */
export function useSocket(token?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (token) {
      const socketInstance = initializeSocket({ token });
      setSocket(socketInstance);

      const handleConnect = () => setIsConnected(true);
      const handleDisconnect = () => setIsConnected(false);

      socketInstance.on('connect', handleConnect);
      socketInstance.on('disconnect', handleDisconnect);

      setIsConnected(socketInstance.connected);

      return () => {
        socketInstance.off('connect', handleConnect);
        socketInstance.off('disconnect', handleDisconnect);
      };
    }
  }, [token]);

  return { socket, isConnected };
}

/**
 * Hook to subscribe to socket events
 */
export function useSocketEvent<T = any>(
  event: string,
  callback: (data: T) => void,
  deps: any[] = []
) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const eventHandler = (data: T) => {
      savedCallback.current(data);
    };

    on(event, eventHandler);

    return () => {
      off(event, eventHandler);
    };
  }, [event, ...deps]);
}

/**
 * Hook to emit socket events
 */
export function useSocketEmit() {
  return useCallback((event: string, data?: any) => {
    emit(event, data);
  }, []);
}

/**
 * Hook for managing room subscriptions
 */
export function useSocketRoom(roomId: string | null) {
  const [isInRoom, setIsInRoom] = useState(false);
  const socketEmit = useSocketEmit();

  useEffect(() => {
    if (!roomId) return;

    const socket = getSocket();
    if (!socket) return;

    // Join room
    socketEmit('joinRoom', roomId);
    setIsInRoom(true);

    // Handle room joined confirmation
    const handleRoomJoined = (data: { roomId: string }) => {
      if (data.roomId === roomId) {
        setIsInRoom(true);
      }
    };

    on('roomJoined', handleRoomJoined);

    // Leave room on cleanup
    return () => {
      socketEmit('leaveRoom', roomId);
      setIsInRoom(false);
      off('roomJoined', handleRoomJoined);
    };
  }, [roomId, socketEmit]);

  return { isInRoom };
}

/**
 * Hook for notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);

  useSocketEvent('notification:new', (notification) => {
    setNotifications((prev) => [notification, ...prev]);
  });

  useSocketEvent('notification:system', (notification) => {
    setNotifications((prev) => [{ ...notification, type: 'system' }, ...prev]);
  });

  const markAsRead = useCallback((notificationId: string) => {
    emit('notification:read', { notificationId });
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    markAsRead,
    clearAll,
    unreadCount: notifications.filter((n) => !n.read).length,
  };
}

/**
 * Hook for online users
 */
export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useSocketEvent<{ userId: string }>('user:online', ({ userId }) => {
    setOnlineUsers((prev) => new Set(prev).add(userId));
  });

  useSocketEvent<{ userId: string }>('user:offline', ({ userId }) => {
    setOnlineUsers((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  });

  const isUserOnline = useCallback(
    (userId: string) => onlineUsers.has(userId),
    [onlineUsers]
  );

  return {
    onlineUsers: Array.from(onlineUsers),
    onlineCount: onlineUsers.size,
    isUserOnline,
  };
}

/**
 * Hook for typing indicators
 */
export function useTypingIndicator(roomId: string) {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const socketEmit = useSocketEmit();
  const timeoutRef = useRef<NodeJS.Timeout>();

  useSocketEvent<{ userId: string; isTyping: boolean }>(
    'message:typing',
    ({ userId, isTyping }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    }
  );

  const startTyping = useCallback(() => {
    socketEmit('typing', { roomId, isTyping: true });

    // Auto-stop after 3 seconds
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      socketEmit('typing', { roomId, isTyping: false });
    }, 3000);
  }, [roomId, socketEmit]);

  const stopTyping = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    socketEmit('typing', { roomId, isTyping: false });
  }, [roomId, socketEmit]);

  return {
    typingUsers: Array.from(typingUsers),
    startTyping,
    stopTyping,
  };
}

export default {
  useSocket,
  useSocketEvent,
  useSocketEmit,
  useSocketRoom,
  useNotifications,
  useOnlineUsers,
  useTypingIndicator,
};
