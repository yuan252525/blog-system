import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../i18n/context';
import { momentsApi } from '../api/moments';
import type { Moment, CommentMomentPayload } from '../types';
import { MomentComposer } from '../components/moments/MomentComposer';
import { MomentCard } from '../components/moments/MomentCard';
import { useMomentsNew } from '../contexts/MomentsNewContext';

export function MomentsPage() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { markSeen } = useMomentsNew();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const hasMore = page < totalPages;

  // 用 ref 保存最新状态，供 IntersectionObserver 回调读取，避免闭包过期
  const loadingRef = useRef(false);
  const pageRef = useRef(1);
  const totalPagesRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (p: number) => {
    if (loadingRef.current) return; // 防止 observer 在 re-render 前重复触发
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await momentsApi.list(p, 10);
      setMoments((prev) => (p === 1 ? res.data : [...prev, ...res.data]));
      setTotalPages(res.meta.totalPages);
      setPage(p);
    } catch {
      // 静默
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await momentsApi.list(1, 10);
      setMoments(res.data);
      setTotalPages(res.meta.totalPages);
      setPage(1);
    } catch {
      // 静默
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  // 进入朋友圈即视为已读，清除红点
  useEffect(() => {
    markSeen();
  }, [markSeen]);

  const handleCreated = (moment: Moment) => setMoments((prev) => [moment, ...prev]);

  const handleToggleLike = async (moment: Moment) => {
    const updated = moment.likedByMe
      ? await momentsApi.unlike(moment.id)
      : await momentsApi.like(moment.id);
    setMoments((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  const handleComment = async (momentId: string, payload: CommentMomentPayload) => {
    const comment = await momentsApi.comment(momentId, payload);
    setMoments((prev) =>
      prev.map((m) => {
        if (m.id !== momentId) return m;
        return {
          ...m,
          comments: [...m.comments, comment],
          _count: { ...m._count, comments: m._count.comments + 1 },
        };
      }),
    );
  };

  const handleDelete = async (moment: Moment) => {
    await momentsApi.remove(moment.id);
    setMoments((prev) => prev.filter((m) => m.id !== moment.id));
  };

  const handleDeleteComment = async (momentId: string, commentId: string) => {
    await momentsApi.deleteComment(commentId);
    setMoments((prev) =>
      prev.map((m) => {
        if (m.id !== momentId) return m;
        return {
          ...m,
          comments: m.comments.filter((c) => c.id !== commentId),
          _count: { ...m._count, comments: Math.max(0, m._count.comments - 1) },
        };
      }),
    );
  };

  // 同步最新状态到 ref
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  useEffect(() => {
    pageRef.current = page;
    totalPagesRef.current = totalPages;
  }, [page, totalPages]);

  // 滚动到底部自动加载下一页
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingRef.current &&
          pageRef.current < totalPagesRef.current
        ) {
          load(pageRef.current + 1);
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, load]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-10">
      <div className="mb-6 flex items-center gap-2">
        <Camera className="h-5 w-5 text-brand-600" />
        <h1 className="font-serif text-2xl font-extrabold tracking-tight text-neutral-900">
          {t('moments.title')}
        </h1>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="ml-auto grid h-9 w-9 cursor-pointer place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-brand-600 disabled:opacity-60"
          aria-label={t('moments.refresh')}
          title={t('moments.refresh')}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isAuthenticated && (
        <div className="mb-6">
          <MomentComposer onCreated={handleCreated} />
        </div>
      )}

      {loading && moments.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">{t('common.loading')}</p>
      ) : moments.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">{t('moments.noMoments')}</p>
      ) : (
        <div className="space-y-4">
          {moments.map((m) => (
            <MomentCard
              key={m.id}
              moment={m}
              currentUserId={user?.id ?? ''}
              onToggleLike={handleToggleLike}
              onComment={handleComment}
              onDelete={handleDelete}
              onDeleteComment={handleDeleteComment}
            />
          ))}
          {hasMore && (
            <div
              ref={sentinelRef}
              className="flex items-center justify-center gap-2 py-6 text-sm text-neutral-400"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('moments.loadingMore')}
                </>
              ) : (
                t('moments.loadMore')
              )}
            </div>
          )}
          {!hasMore && moments.length > 0 && (
            <p className="py-6 text-center text-xs text-neutral-400">{t('moments.noMore')}</p>
          )}
        </div>
      )}
    </div>
  );
}
