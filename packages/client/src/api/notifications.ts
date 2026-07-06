import apiClient from './client';
import type { Notification, NotificationListResponse } from '../types/notification';

export const notificationsApi = {
  getList: (page = 1, limit = 20, unreadOnly = false) =>
    apiClient.get<unknown, NotificationListResponse>('/notifications', {
      params: { page, limit, unreadOnly },
    }),

  getUnreadCount: () =>
    apiClient.get<unknown, { count: number }>('/notifications/unread-count'),

  markAsRead: (id: string) =>
    apiClient.put<unknown, Notification>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    apiClient.put<unknown, { success: boolean }>('/notifications/read-all'),
};
