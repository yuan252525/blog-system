import apiClient from './client';
import type { PublicUserProfile } from '../types/follow';

export const usersApi = {
  getByUsername: (username: string) =>
    apiClient.get<unknown, PublicUserProfile>(`/users/${encodeURIComponent(username)}`),
};
