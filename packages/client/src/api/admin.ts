import apiClient from './client';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'BANNED';
  points: number;
  level: number;
  createdAt: string;
  _count: { posts: number; comments: number };
}

export interface AdminComment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string; avatar: string | null };
  post: { id: string; title: string } | null;
  _count: { replies: number; likes: number };
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count: { posts: number };
}

export interface AdminTag {
  id: string;
  name: string;
  slug: string;
  _count: { posts: number };
}

export interface Paged<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface SiteSettings {
  siteTitle: string;
  siteDescription: string;
  siteKeywords: string;
  contactEmail: string;
  postsPerPage: string;
}

export const adminApi = {
  // ---------- Users ----------
  listUsers: (params: { page?: number; limit?: number; search?: string; role?: string; status?: string }) =>
    apiClient.get<unknown, Paged<AdminUser>>('admin/users', { params }),
  getUser: (id: string) => apiClient.get<unknown, AdminUser & { bio: string | null }>(`admin/users/${id}`),
  updateUser: (id: string, data: { role?: 'USER' | 'ADMIN'; status?: 'ACTIVE' | 'BANNED' }) =>
    apiClient.put<unknown, AdminUser>(`admin/users/${id}`, data),
  deleteUser: (id: string) => apiClient.delete<unknown, { message: string }>(`admin/users/${id}`),

  // ---------- Comments ----------
  listComments: (params: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<unknown, Paged<AdminComment>>('admin/comments', { params }),
  deleteComment: (id: string) => apiClient.delete<unknown, { message: string }>(`admin/comments/${id}`),

  // ---------- Categories ----------
  listCategories: () => apiClient.get<unknown, AdminCategory[]>('admin/categories'),
  createCategory: (data: { name: string; description?: string }) =>
    apiClient.post<unknown, AdminCategory>('admin/categories', data),
  updateCategory: (id: string, data: { name: string; description?: string }) =>
    apiClient.put<unknown, AdminCategory>(`admin/categories/${id}`, data),
  deleteCategory: (id: string) => apiClient.delete<unknown, { message: string }>(`admin/categories/${id}`),

  // ---------- Tags ----------
  listTags: () => apiClient.get<unknown, AdminTag[]>('admin/tags'),
  createTag: (data: { name: string }) => apiClient.post<unknown, AdminTag>('admin/tags', data),
  updateTag: (id: string, data: { name: string }) =>
    apiClient.put<unknown, AdminTag>(`admin/tags/${id}`, data),
  deleteTag: (id: string) => apiClient.delete<unknown, { message: string }>(`admin/tags/${id}`),

  // ---------- Settings ----------
  getSettings: () => apiClient.get<unknown, SiteSettings>('admin/settings'),
  updateSettings: (data: Partial<SiteSettings>) =>
    apiClient.put<unknown, SiteSettings>('admin/settings', data),
};
