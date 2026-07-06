import apiClient from './client';

export interface LikeStatus {
  liked: boolean;
  count: number;
}

export const likesApi = {
  toggle: (postId: string) =>
    apiClient.post<unknown, { liked: boolean }>(`/likes/post/${postId}`),

  getStatus: (postId: string) =>
    apiClient.get<unknown, LikeStatus>(`/likes/post/${postId}`),
};
