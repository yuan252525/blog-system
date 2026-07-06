export type NotificationType = 'COMMENT_REPLY' | 'POST_LIKE' | 'COMMENT_LIKE' | 'CHAT_MENTION';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
  userId: string;
  actorId: string;
  postId: string | null;
  commentId: string | null;
  actor: {
    id: string;
    username: string;
    avatar: string | null;
  };
  post?: {
    id: string;
    slug: string;
  } | null;
}

export interface NotificationListResponse {
  data: Notification[];
  unreadCount: number;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
