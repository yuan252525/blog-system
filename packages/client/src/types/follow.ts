export interface UserBasic {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
}

export interface FollowStatus {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

export interface FollowListResponse {
  data: UserBasic[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PublicUserProfile {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
  points: number;
  level: number;
  _count: {
    posts: number;
    followers: number;
    following: number;
  };
}
