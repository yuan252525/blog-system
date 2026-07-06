import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../i18n/context';
import { notificationsApi } from '../api/notifications';
import type { Notification } from '../types/notification';

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { unreadCount, notifications, setNotifications, markAsRead, markAllAsRead, setUnreadCount } =
    useNotificationStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 挂载时自动获取未读数量，并定时轮询
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchUnreadCount = async () => {
      try {
        const data = await notificationsApi.getUnreadCount();
        setUnreadCount(data.count);
      } catch {
        // silent
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, setUnreadCount]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleToggle = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && isAuthenticated) {
      setLoading(true);
      try {
        const data = await notificationsApi.getList(1, 10);
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      markAllAsRead();
    } catch {
      // silent
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      try {
        await notificationsApi.markAsRead(notif.id);
        markAsRead(notif.id);
      } catch {
        // silent
      }
    }
    setOpen(false);
  };

  // 获取通知链接
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

  // 通知图标
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

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative rounded-lg p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
        title={t('notifications.title')}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[28rem] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-elevated z-50 animate-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <h3 className="text-sm font-semibold text-neutral-900">
              {t('notifications.title')}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
              >
                <CheckCheck className="h-3 w-3" />
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[22rem]">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-neutral-400">
                {t('common.loading')}
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-neutral-400">
                {t('notifications.empty')}
              </div>
            ) : (
              notifications.map((notif) => (
                <Link
                  key={notif.id}
                  to={getNotificationLink(notif)}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors border-b border-neutral-50 last:border-b-0 ${
                    !notif.isRead ? 'bg-brand-50/50' : ''
                  }`}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-700 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      {new Date(notif.createdAt).toLocaleDateString(
                        navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US',
                        { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
                      )}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <span className="flex-shrink-0 mt-2 h-2 w-2 rounded-full bg-brand-600" />
                  )}
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-center text-xs font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 border-t border-neutral-100 transition-colors"
            >
              {t('notifications.viewAll')}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
