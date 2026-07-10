export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  createdAt?: string;
  points: number;
  level: number;
  lastCheckIn: string | null;
  checkInStreak: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
