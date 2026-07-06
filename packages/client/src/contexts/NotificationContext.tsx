import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import type { Notification } from '../types/notification';

interface NotificationContextValue {
  socket: Socket | null;
}

const NotificationContext = createContext<NotificationContextValue>({
  socket: null,
});

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken } = useAuthStore();
  const { addNotification, setUnreadCount } = useNotificationStore();

  const connect = useCallback(() => {
    const token = accessToken || localStorage.getItem('access_token');
    if (!token) return;

    if (socketRef.current?.connected) return;

    const socket = io(`${SOCKET_URL}/notifications`, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      console.log('[Notification] WebSocket connected');
      // 发送认证消息
      socket.emit('auth', { token: `Bearer ${token}` });
    });

    socket.on('new_notification', (notification: Notification) => {
      addNotification(notification);
    });

    socket.on('unread_count', ({ count }: { count: number }) => {
      setUnreadCount(count);
    });

    socket.on('auth_ok', () => {
      console.log('[Notification] Auth OK');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Notification] WebSocket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[Notification] Connection error:', err.message);
    });

    socketRef.current = socket;
  }, [accessToken, addNotification, setUnreadCount]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  return (
    <NotificationContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationSocket() {
  return useContext(NotificationContext);
}
