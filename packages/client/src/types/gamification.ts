export interface BadgeInfo {
  key: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
}

export interface GamificationStatus {
  points: number;
  level: number;
  exp: number;
  expToNext: number;
  streak: number;
  lastCheckIn: string | null;
  checkedInToday: boolean;
  badges: BadgeInfo[];
}

export interface CheckInResult {
  streak: number;
  gained: number;
  points: number;
  level: number;
  checkedInToday: boolean;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar: string | null;
  level: number;
  points: number;
}
