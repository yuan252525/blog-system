import apiClient from './client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  _count?: { posts: number };
}

export const categoriesApi = {
  getAll: () =>
    apiClient.get<unknown, Category[]>('/categories'),

  getBySlug: (slug: string) =>
    apiClient.get<unknown, Category>(`/categories/${slug}`),

  create: (data: { name: string; description?: string }) =>
    apiClient.post<unknown, Category>('/categories', data),

  delete: (id: string) =>
    apiClient.delete<unknown, { message: string }>(`/categories/${id}`),
};
