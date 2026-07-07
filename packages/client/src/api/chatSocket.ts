import io, { Socket } from 'socket.io-client';
import type { ChatMessage } from '../types';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function getChatSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(`${SOCKET_URL}/chat`, {
    auth: { token: `Bearer ${token}` },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

export function disconnectChatSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinRoom(socket: Socket, roomId: string): void {
  socket.emit('join_room', { roomId });
}

export function leaveRoom(socket: Socket, roomId: string): void {
  socket.emit('leave_room', { roomId });
}

export function sendMessage(
  socket: Socket,
  data: {
    roomId: string;
    content: string;
    type?: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    mentions?: string[];
  },
): void {
  socket.emit('send_message', data);
}

export function sendTyping(socket: Socket, roomId: string): void {
  socket.emit('typing', { roomId });
}

export function sendStopTyping(socket: Socket, roomId: string): void {
  socket.emit('stop_typing', { roomId });
}

export function markRead(socket: Socket, roomId: string): void {
  socket.emit('mark_read', { roomId });
}

export function reactMessage(
  socket: Socket,
  data: { messageId: string; type: 'LIKE' | 'CHEER' },
): void {
  socket.emit('react_message', data);
}

export function loadMessages(
  socket: Socket,
  roomId: string,
  page?: number,
  limit?: number,
): void {
  socket.emit('load_messages', { roomId, page, limit });
}

export type { Socket, ChatMessage };
