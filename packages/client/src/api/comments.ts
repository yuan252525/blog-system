import apiClient from './client';

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; username: string; avatar: string | null };
  replies?: Comment[];
  _count?: { likes: number };
  isLiked?: boolean;
}

export const commentsApi = {
  getByPost: (postId: string) =>
    apiClient.get<unknown, Comment[]>(`/comments/post/${postId}`),

  create: (data: { content: string; postId: string; parentId?: string }) =>
    apiClient.post<unknown, Comment>('/comments', data),

  update: (id: string, data: { content: string }) =>
    apiClient.put<unknown, Comment>(`/comments/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<unknown, { message: string }>(`/comments/${id}`),

  like: (commentId: string) =>
    apiClient.post<unknown, { liked: boolean }>(`/comments/${commentId}/like`),
};
