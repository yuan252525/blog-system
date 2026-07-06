import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { postsApi } from '../../api/posts';
import { Pagination } from '../../components/Pagination';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useTranslation } from '../../i18n/context';
import { Plus, Pencil, Trash2, Eye, Loader2 } from 'lucide-react';
import type { Post, PostStatus } from '../../types';

const statusTabs: { labelKey: string; value: PostStatus | 'ALL' }[] = [
  { labelKey: 'admin.allPosts', value: 'ALL' },
  { labelKey: 'admin.published', value: 'PUBLISHED' },
  { labelKey: 'admin.drafts', value: 'DRAFT' },
  { labelKey: 'admin.archived', value: 'ARCHIVED' },
];

export function AdminPostsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await postsApi.getList(params);
      setPosts(res.data);
      setTotalPages(res.meta.totalPages);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    setDeleting(id);
    try {
      await postsApi.delete(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // handled by interceptor
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('admin.managePosts')}</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage your blog content</p>
        </div>
        <Link
          to="/admin/posts/new"
          className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors w-fit"
        >
          <Plus className="h-4 w-4" />
          {t('admin.createPost')}
        </Link>
      </div>

      {/* Status tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-neutral-100 p-1 w-fit">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all cursor-pointer ${
              statusFilter === tab.value
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t(tab.labelKey as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            {t('common.loading')}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-neutral-400 font-medium">{t('admin.noPosts')}</p>
            <Link to="/admin/posts/new" className="mt-2 inline-block text-sm text-brand-600 hover:text-brand-700">
              {t('admin.writeFirst')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {t('admin.postTitle')}
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                    {t('admin.status')}
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                    {t('admin.views')}
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider hidden lg:table-cell">
                    {t('admin.date')}
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {t('admin.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {posts.map((post) => (
                  <tr key={post.id} className="group hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="max-w-xs sm:max-w-sm">
                        <p className="font-medium text-neutral-900 truncate">{post.title}</p>
                        <div className="flex items-center gap-2 mt-1 sm:hidden">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            post.status === 'PUBLISHED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : post.status === 'DRAFT'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-neutral-100 text-neutral-500'
                          }`}>
                            {post.status}
                          </span>
                          <span className="text-xs text-neutral-400">{post.viewCount} {t('post.views')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        post.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : post.status === 'DRAFT'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                      }`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5 text-neutral-300" />{post.viewCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-400 hidden lg:table-cell">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/admin/posts/${post.id}/edit`)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t('common.edit')}</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ id: post.id, title: post.title })}
                          disabled={deleting === post.id}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {deleting === post.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">
                            {deleting === post.id ? '...' : t('common.delete')}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title={t('editor.deletePost')}
        description={t('editor.deleteConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
