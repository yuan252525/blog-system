import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminComment } from '../../api/admin';
import { Pagination } from '../../components/Pagination';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useTranslation } from '../../i18n/context';
import { Trash2, Loader2, Search, MessageSquare } from 'lucide-react';

export function AdminCommentsPage() {
  const { t } = useTranslation();
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminComment | null>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      const res = await adminApi.listComments(params);
      setComments(res.data);
      setTotalPages(res.meta.totalPages);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setBusyId(deleteConfirm.id);
    try {
      await adminApi.deleteComment(deleteConfirm.id);
      setComments((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch {
      // handled by interceptor
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-neutral-900">{t('admin.comments')}</h2>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('admin.searchUser')}
            className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-400"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare className="mx-auto mb-2 h-6 w-6 text-neutral-300" />
            <p className="font-medium text-neutral-400">{t('admin.noComments')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-50">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <span className="font-medium text-neutral-700">{c.user.username}</span>
                    {c.post && (
                      <>
                        <span>·</span>
                        <Link to={`/posts/${c.post.id}`} className="truncate text-brand-600 hover:underline">
                          {c.post.title}
                        </Link>
                      </>
                    )}
                    <span>·</span>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-neutral-800">{c.content}</p>
                  {(c._count.replies > 0 || c._count.likes > 0) && (
                    <div className="mt-1 text-xs text-neutral-400">
                      {c._count.replies} {t('admin.comments')} · {c._count.likes} {t('comments.like')}
                    </div>
                  )}
                </div>
                <button
                  disabled={busyId === c.id}
                  onClick={() => setDeleteConfirm(c)}
                  className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                >
                  {busyId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title={t('admin.comments')}
        description={t('comments.deleteConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
