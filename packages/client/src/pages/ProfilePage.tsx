import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { postsApi } from '../api/posts';
import { PostCard } from '../components/PostCard';
import { Pagination } from '../components/Pagination';
import { useTranslation } from '../i18n/context';
import { Calendar, FileText, Edit3 } from 'lucide-react';
import type { Post } from '../types';

export function ProfilePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    postsApi
      .getList({ page, limit: 10, status: undefined })
      .then((res) => {
        setPosts(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  if (!user) return null;

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(
        navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US',
        { year: 'numeric', month: 'long' },
      )
    : '—';

  const postCount = (user as unknown as Record<string, unknown>)._count as { posts?: number } | undefined;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      {/* Profile header */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 mb-8">
        <div className="flex items-start gap-5">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.username}
              className="h-20 w-20 rounded-2xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-100 text-2xl font-bold text-brand-600 uppercase flex-shrink-0">
              {user.username.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">{user.username}</h1>
                <p className="text-sm text-neutral-500 mt-0.5">{user.email}</p>
              </div>
              <Link
                to="/profile/edit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" />
                {t('profile.editProfile')}
              </Link>
            </div>
            {user.bio && (
              <p className="mt-3 text-sm text-neutral-600 leading-relaxed">{user.bio}</p>
            )}
            <div className="mt-4 flex items-center gap-5 text-sm text-neutral-500">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-neutral-400" />
                <strong className="text-neutral-700">{postCount?.posts ?? 0}</strong> {t('profile.totalPosts')}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-neutral-400" />
                {t('profile.memberSince')}: {memberSince}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* My posts */}
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('profile.totalPosts')}</h2>
      {loading ? (
        <div className="space-y-5">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-neutral-100 bg-white p-6">
              <div className="h-6 w-3/4 rounded-lg bg-neutral-100 mb-3" />
              <div className="h-4 w-full rounded-lg bg-neutral-50" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="py-10 text-center text-neutral-400">{t('common.noData')}</div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <div className="mt-8">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
