import apiClient from './client';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<unknown, AuthResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<unknown, AuthResponse>('/auth/register', data),

  getProfile: () => apiClient.get<unknown, User>('/auth/profile'),

  updateProfile: (data: { username?: string; avatar?: string; bio?: string }) =>
    apiClient.put<unknown, User>('/auth/profile', data),
};
