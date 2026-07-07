export interface MomentUser {
  id: string;
  username: string;
  avatar: string | null;
}

export interface MomentLike {
  id: string;
  userId: string;
  user: MomentUser;
}

export interface MomentComment {
  id: string;
  content: string;
  createdAt: string;
  user: MomentUser;
  replyToUser: MomentUser | null;
  parentId: string | null;
}

export interface Moment {
  id: string;
  content: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
  author: MomentUser;
  likes: MomentLike[];
  comments: MomentComment[];
  _count: {
    likes: number;
    comments: number;
  };
  likedByMe: boolean;
}

export interface MomentListResponse {
  data: Moment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
