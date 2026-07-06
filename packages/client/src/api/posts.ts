import apiClient from './client';
import type { Post, PaginatedResponse, CreatePostRequest, UpdatePostRequest } from '../types';

export const postsApi = {
  getList: (params?: Record<string, unknown>) =>
    apiClient.get<unknown, PaginatedResponse<Post>>('/posts', { params }),

  getBySlug: (slug: string) =>
    apiClient.get<unknown, Post>(`/posts/${slug}`),

  getRelatedPosts: (id: string) =>
    apiClient.get<unknown, Post[]>(`/posts/related/${id}`),

  create: (data: CreatePostRequest) =>
    apiClient.post<unknown, Post>('/posts', data),

  update: (id: string, data: UpdatePostRequest) =>
    apiClient.put<unknown, Post>(`/posts/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<unknown, { message: string }>(`/posts/${id}`),
};
