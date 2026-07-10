import apiClient from './client';
import type { FollowStatus, FollowListResponse } from '../types/follow';

export const followApi = {
  follow: (username: string) =>
    apiClient.post<unknown, { following: boolean }>(`/follow/${encodeURIComponent(username)}`),
  unfollow: (username: string) =>
    apiClient.delete<unknown, { following: boolean }>(`/follow/${encodeURIComponent(username)}`),
  status: (username: string) =>
    apiClient.get<unknown, FollowStatus>(`/follow/${encodeURIComponent(username)}/status`),
  followers: (username: string, page = 1, limit = 20) =>
    apiClient.get<unknown, FollowListResponse>(`/follow/${encodeURIComponent(username)}/followers`, {
      params: { page, limit },
    }),
  following: (username: string, page = 1, limit = 20) =>
    apiClient.get<unknown, FollowListResponse>(`/follow/${encodeURIComponent(username)}/following`, {
      params: { page, limit },
    }),
};
