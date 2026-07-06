import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCheck, Bell } from 'lucide-react';
import { notificationsApi } from '../api/notifications';
import { useNotificationStore } from '../stores/notificationStore';
import { useTranslation } from '../i18n/context';
import type { Notification } from '../types/notification';

export function NotificationsPage() {
  const { t } = useTranslation();
  const { notifications, setNotifications, setUnreadCount, markAsRead, markAllAsRead } =
    useNotificationStore();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadNotifications = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await notificationsApi.getList(p, 20);
      setNotifications(data.data);
      setUnreadCount(data.unreadCount);
      setTotalPages(data.meta.totalPages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [setNotifications, setUnreadCount]);

  useEffect(() => {
    loadNotifications(page);
  }, [page, loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      markAllAsRead();
    } catch {
      // silent
    }
  };

  const handleMarkRead = async (notif: Notification) => {
    if (!notif.isRead) {
      try {
        await notificationsApi.markAsRead(notif.id);
        markAsRead(notif.id);
      } catch {
        // silent
      }
    }
  };

  const getNotificationLink = (notif: Notification) => {
    if (notif.type === 'CHAT_MENTION') {
      return notif.commentId ? `/chat?room=${notif.commentId}` : '/chat';
    }
    const slug = notif.post?.slug || notif.postId;
    if (slug) {
      if (notif.commentId) {
        return `/posts/${slug}#comment-${notif.commentId}`;
      }
      return `/posts/${slug}`;
    }
    return '#';
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'COMMENT_REPLY':
        return '💬';
      case 'POST_LIKE':
        return '❤️';
      case 'COMMENT_LIKE':
        return '👍';
      case 'CHAT_MENTION':
        return '📢';
      default:
        return '🔔';
    }
  };

  return (
    <div className="page-enter container mx-auto max-w-2xl px-4 py-8 md:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-neutral-900">
            {t('notifications.title')}
          </h1>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          {t('notifications.markAllRead')}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-neutral-400">
          <Bell className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('common.loading')}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 mx-auto mb-4 text-neutral-200" />
          <p className="text-sm text-neutral-400">{t('notifications.empty')}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          {notifications.map((notif) => (
            <Link
              key={notif.id}
              to={getNotificationLink(notif)}
              onClick={() => handleMarkRead(notif)}
              className={`flex items-start gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-b-0 ${
                !notif.isRead ? 'bg-brand-50/40' : ''
              }`}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">
                {getNotificationIcon(notif.type)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <p className="text-sm text-neutral-800 flex-1">
                    {notif.message}
                  </p>
                  {!notif.isRead && (
                    <span className="flex-shrink-0 mt-1.5 h-2 w-2 rounded-full bg-brand-600" />
                  )}
                </div>
                <p className="mt-1.5 text-xs text-neutral-400">
                  {new Date(notif.createdAt).toLocaleDateString(
                    navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US',
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {t('pagination.prev')}
          </button>
          <span className="text-sm text-neutral-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {t('pagination.next')}
          </button>
        </div>
      )}
    </div>
  );
}
