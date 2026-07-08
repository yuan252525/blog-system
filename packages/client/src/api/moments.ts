import apiClient from './client';
import type { Moment, MomentComment, MomentListResponse } from '../types';

export interface CreateMomentPayload {
  content: string;
  images?: string[];
}

export interface CommentMomentPayload {
  content: string;
  parentId?: string;
  replyToUserId?: string;
}

export const momentsApi = {
  list: (page = 1, limit = 10) =>
    apiClient.get<unknown, MomentListResponse>('/moments', { params: { page, limit } }),

  hasNew: (since: string) =>
    apiClient.get<unknown, { hasNew: boolean }>('/moments/has-new', { params: { since } }),

  get: (id: string) => apiClient.get<unknown, Moment>(`/moments/${id}`),

  create: (data: CreateMomentPayload) =>
    apiClient.post<unknown, Moment>('/moments', data),

  remove: (id: string) =>
    apiClient.delete<unknown, { message: string }>(`/moments/${id}`),

  like: (id: string) =>
    apiClient.post<unknown, Moment>(`/moments/${id}/like`),

  unlike: (id: string) =>
    apiClient.delete<unknown, Moment>(`/moments/${id}/like`),

  comment: (id: string, data: CommentMomentPayload) =>
    apiClient.post<unknown, MomentComment>(`/moments/${id}/comments`, data),

  deleteComment: (commentId: string) =>
    apiClient.delete<unknown, { message: string }>(`/moments/comments/${commentId}`),
};
