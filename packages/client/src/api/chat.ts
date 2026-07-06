import apiClient from './client';

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: 'GROUP' | 'DIRECT';
  memberCount: number;
  members: { id: string; username: string; avatar?: string }[];
  latestMessage?: {
    id: string;
    content: string;
    type: string;
    createdAt: string;
    username: string;
  } | null;
  lastReadAt?: string;
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  mimeType?: string;
  roomId: string;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  mentions?: {
    user: {
      id: string;
      username: string;
    };
  }[];
}

export interface ChatMessagesResponse {
  data: ChatMessage[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ChatUser {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface DiscoverableRoom {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  createdBy: { id: string; username: string; avatar?: string };
}

export const chatApi = {
  getRooms: () => apiClient.get('/chat/rooms') as Promise<ChatRoom[]>,

  getDiscoverableRooms: () => apiClient.get('/chat/rooms/discover') as Promise<DiscoverableRoom[]>,

  createRoom: (data: { name: string; description?: string }) =>
    apiClient.post('/chat/rooms', data) as Promise<ChatRoom>,

  getRoom: (id: string) => apiClient.get(`/chat/rooms/${id}`) as Promise<ChatRoom>,

  createDirectRoom: (userId: string) =>
    apiClient.post(`/chat/rooms/direct/${userId}`) as Promise<ChatRoom>,

  joinRoom: (id: string) =>
    apiClient.post(`/chat/rooms/${id}/join`) as Promise<void>,

  leaveRoom: (id: string) =>
    apiClient.delete(`/chat/rooms/${id}/leave`) as Promise<void>,

  inviteUsers: (roomId: string, userIds: string[]) =>
    apiClient.post(`/chat/rooms/${roomId}/invite`, { userIds }) as Promise<{ invited: number; skipped: number }>,

  getMembers: (id: string) =>
    apiClient.get(`/chat/rooms/${id}/members`) as Promise<ChatUser[]>,

  getMessages: (id: string, page = 1, limit = 50) =>
    apiClient.get(`/chat/rooms/${id}/messages`, { params: { page, limit } }) as Promise<ChatMessagesResponse>,

  searchUsers: (query: string) =>
    apiClient.get('/chat/users/search', { params: { q: query } }) as Promise<ChatUser[]>,

  getUnreadCount: (roomId: string) =>
    apiClient.get(`/chat/rooms/${roomId}/unread`) as Promise<{ count: number }>,

  getTotalUnread: () =>
    apiClient.get('/chat/unread') as Promise<{ total: number }>,
};
