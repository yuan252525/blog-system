import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  getChatSocket,
  disconnectChatSocket,
  joinRoom,
  leaveRoom,
  sendMessage,
  sendTyping,
  sendStopTyping,
  markRead,
} from '../api/chatSocket';
import { chatApi, type ChatRoom, type ChatMessage } from '../api/chat';
import type { Socket } from 'socket.io-client';

export function useChat() {
  const { user, isAuthenticated } = useAuth();
  const token = localStorage.getItem('access_token');

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<{ userId: string; username: string }[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, { userId: string; username: string }>>(new Map());
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 初始化 Socket 连接
  useEffect(() => {
    if (!token || !isAuthenticated) return;

    const s = getChatSocket(token);
    setSocket(s);

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('auth_error', () => setConnected(false));

    s.on('joined_room', (data: { roomId: string; messages: ChatMessage[]; meta: { hasMore: boolean } }) => {
      setMessages(data.messages);
      setHasMore(data.meta.hasMore);
      setCurrentPage(1);
      // 滚动到底部
      setTimeout(() => scrollToBottom(), 150);
    });

    s.on('new_message', (message: ChatMessage) => {
      setMessages((prev) => {
        // 防重：检查是否已存在该消息
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      // 滚动到底部
      setTimeout(() => scrollToBottom(), 100);
    });

    s.on('user_joined', (data: { userId: string; username: string; roomId: string }) => {
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.userId === data.userId)) return prev;
        return [...prev, { userId: data.userId, username: data.username }];
      });
    });

    s.on('user_left', (data: { userId: string; username: string; roomId: string }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    s.on('user_offline', (data: { userId: string; username: string }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    s.on('online_users', (data: { users: { userId: string; username: string }[] }) => {
      setOnlineUsers(data.users);
    });

    s.on('typing', (data: { userId: string; username: string; roomId: string }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(data.userId, data);

        // 清除旧定时器
        const existing = typingTimersRef.current.get(data.userId);
        if (existing) clearTimeout(existing);

        // 5 秒后自动清除 typing 状态
        typingTimersRef.current.set(
          data.userId,
          setTimeout(() => {
            setTypingUsers((prev2) => {
              const next2 = new Map(prev2);
              next2.delete(data.userId);
              return next2;
            });
          }, 5000),
        );

        return next;
      });
    });

    s.on('stop_typing', (data: { userId: string }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    });

    s.on('message_history', (data: { messages: ChatMessage[]; meta: { hasMore: boolean } }) => {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMessages = data.messages.filter((m) => !existingIds.has(m.id));
        return [...newMessages, ...prev];
      });
      setHasMore(data.meta.hasMore);
      setLoadingMessages(false);
    });

    s.on('error', (err: { event: string; message: string }) => {
      console.error(`Chat error [${err.event}]:`, err.message);
    });

    return () => {
      s.off('connect');
      s.off('disconnect');
      s.off('auth_error');
      s.off('joined_room');
      s.off('new_message');
      s.off('user_joined');
      s.off('user_left');
      s.off('user_offline');
      s.off('online_users');
      s.off('typing');
      s.off('stop_typing');
      s.off('message_history');
      s.off('error');
    };
  }, [token, isAuthenticated]);

  // 加载房间列表
  useEffect(() => {
    if (!isAuthenticated) return;
    chatApi.getRooms().then(setRooms).catch(() => {});
  }, [isAuthenticated]);

  // 切换房间
  const switchRoom = useCallback(
    (roomId: string) => {
      if (!socket) return;

      // 离开旧房间
      if (activeRoomId) {
        leaveRoom(socket, activeRoomId);
      }

      setActiveRoomId(roomId);
      setMessages([]);
      setOnlineUsers([]);
      setTypingUsers(new Map());
      setCurrentPage(1);
      setHasMore(false);

      // 加入新房间
      joinRoom(socket, roomId);
      markRead(socket, roomId);

      // 重新加载房间列表以更新最新消息
      chatApi.getRooms().then(setRooms).catch(() => {});
    },
    [socket, activeRoomId],
  );

  // 发送消息
  const handleSendMessage = useCallback(
    (content: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT', attachments?: {
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
    }, mentions?: string[]) => {
      if (!socket || !activeRoomId) return;

      sendMessage(socket, {
        roomId: activeRoomId,
        content,
        type,
        ...attachments,
        mentions,
      });

      sendStopTyping(socket, activeRoomId);
    },
    [socket, activeRoomId],
  );

  // 发送输入状态
  const handleTyping = useCallback(() => {
    if (!socket || !activeRoomId) return;
    sendTyping(socket, activeRoomId);
  }, [socket, activeRoomId]);

  const handleStopTyping = useCallback(() => {
    if (!socket || !activeRoomId) return;
    sendStopTyping(socket, activeRoomId);
  }, [socket, activeRoomId]);

  // 加载更多消息
  const loadMoreMessages = useCallback(() => {
    if (!socket || !activeRoomId || loadingMessages || !hasMore) return;

    setLoadingMessages(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);

    socket.emit('load_messages', { roomId: activeRoomId, page: nextPage, limit: 50 });
  }, [socket, activeRoomId, loadingMessages, hasMore, currentPage]);

  // 创建群聊
  const createGroupRoom = useCallback(
    async (name: string, description?: string) => {
      const room = await chatApi.createRoom({ name, description });
      setRooms((prev) => [room, ...prev]);
      switchRoom(room.id);
      return room;
    },
    [switchRoom],
  );

  // 创建/打开私聊
  const startDirectChat = useCallback(
    async (targetUserId: string) => {
      // 检查是否已有私聊房间
      const existing = rooms.find((r) => r.type === 'DIRECT' && r.members.some((m) => m.id === targetUserId));
      if (existing) {
        switchRoom(existing.id);
        return existing;
      }
      const room = await chatApi.createDirectRoom(targetUserId);
      setRooms((prev) => [room, ...prev]);
      switchRoom(room.id);
      return room;
    },
    [rooms, switchRoom],
  );

  // 加入群聊
  const joinGroupRoom = useCallback(
    async (roomId: string) => {
      await chatApi.joinRoom(roomId);
      chatApi.getRooms().then(setRooms).catch(() => {});
      switchRoom(roomId);
    },
    [switchRoom],
  );

  // 离开群聊
  const leaveRoomAction = useCallback(
    async (roomId: string) => {
      await chatApi.leaveRoom(roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      if (activeRoomId === roomId) {
        setActiveRoomId(null);
        setMessages([]);
      }
    },
    [activeRoomId],
  );

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 新消息时滚动
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  // 清理
  useEffect(() => {
    return () => {
      typingTimersRef.current.forEach((timer) => clearTimeout(timer));
      disconnectChatSocket();
    };
  }, []);

  return {
    socket,
    connected,
    user,
    rooms,
    activeRoomId,
    messages,
    onlineUsers,
    typingUsers,
    loadingMessages,
    hasMore,
    messagesEndRef,
    switchRoom,
    handleSendMessage,
    handleTyping,
    handleStopTyping,
    loadMoreMessages,
    createGroupRoom,
    startDirectChat,
    joinGroupRoom,
    leaveRoomAction,
  };
}
