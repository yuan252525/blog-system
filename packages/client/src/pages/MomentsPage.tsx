import { useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../i18n/context';
import { momentsApi } from '../api/moments';
import type { Moment, CommentMomentPayload } from '../types';
import { MomentComposer } from '../components/moments/MomentComposer';
import { MomentCard } from '../components/moments/MomentCard';

export function MomentsPage() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p: number) => {
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

  const loadMore = () => {
    if (page < totalPages && !loading) load(page + 1);
  };

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
          {page < totalPages && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              className="mx-auto block rounded-md px-4 py-2 text-sm text-neutral-500 transition-colors hover:text-brand-600 disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('moments.loadMore')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
