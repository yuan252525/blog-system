import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { postsApi } from '../../api/posts';
import { categoriesApi } from '../../api/categories';
import { PostCard } from '../../components/PostCard';
import { Pagination } from '../../components/Pagination';
import { useTranslation } from '../../i18n/context';
import { ArrowLeft, Folder } from 'lucide-react';
import type { Post } from '../../types';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const [category, postData] = await Promise.all([
        categoriesApi.getBySlug(slug),
        postsApi.getList({ page, limit: 10, category: slug }),
      ]);
      setCategoryName(category.name);
      setPosts(postData.data);
      setTotalPages(postData.meta.totalPages);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [slug, page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-600 transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('post.backToHome')}
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100">
          <Folder className="h-5 w-5 text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{categoryName || slug}</h1>
          <p className="text-sm text-neutral-500">{t('category.title')}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-neutral-100 bg-white p-6 md:p-8">
              <div className="h-6 w-3/4 rounded-lg bg-neutral-100 mb-3" />
              <div className="h-4 w-full rounded-lg bg-neutral-50 mb-2" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-neutral-400">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <div className="mt-10">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
