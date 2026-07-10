import apiClient from './client';
import type { CheckInResult, GamificationStatus, BadgeInfo, LeaderboardEntry } from '../types';

export const gamificationApi = {
  checkIn: () => apiClient.post<unknown, CheckInResult>('/gamification/checkin'),

  getMe: () => apiClient.get<unknown, GamificationStatus>('/gamification/me'),

  getBadges: () => apiClient.get<unknown, BadgeInfo[]>('/gamification/badges'),

  getLeaderboard: (limit = 20) =>
    apiClient.get<unknown, LeaderboardEntry[]>(`/gamification/leaderboard?limit=${limit}`),
};
