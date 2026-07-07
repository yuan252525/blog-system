import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { postsApi } from '../../api/posts';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';
import { CommentSection } from '../../components/CommentSection';
import { LikeButton } from '../../components/LikeButton';
import { LazyImage } from '../../components/LazyImage';
import { useTranslation } from '../../i18n/context';
import { getReadingTime } from '../../utils/readingTime';
import { Calendar, Eye, ArrowLeft, Clock } from 'lucide-react';
import type { Post } from '../../types';

export function PostDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { t } = useTranslation();
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 滚动到指定评论（处理 #comment-xxx hash）
  const scrollToComment = useCallback(() => {
    const hash = location.hash;
    if (hash && hash.startsWith('#comment-')) {
      // 延迟等待 DOM 渲染完成
      const tryScroll = (retries: number) => {
        const el = document.getElementById(hash.replace('#', ''));
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-brand-400', 'ring-offset-2');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-brand-400', 'ring-offset-2');
          }, 3000);
        } else if (retries > 0) {
          setTimeout(() => tryScroll(retries - 1), 300);
        }
      };
      setTimeout(() => tryScroll(8), 500);
    }
  }, [location.hash]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    postsApi
      .getBySlug(slug)
      .then((p) => {
        setPost(p);
        postsApi
          .getRelatedPosts(p.id)
          .then((rp) => setRelatedPosts(rp as unknown as Post[]))
          .catch(() => {});
      })
      .catch(() => setError(t('post.backToHome')))
      .finally(() => setLoading(false));
  }, [slug, t]);

  // 评论数据加载后执行滚动
  useEffect(() => {
    if (!loading && post) {
      scrollToComment();
    }
  }, [loading, post, scrollToComment]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12 md:py-20">
        <div className="animate-pulse">
          <div className="flex gap-2 mb-6">
            <div className="h-6 w-16 rounded-full bg-neutral-100" />
            <div className="h-6 w-20 rounded-full bg-neutral-100" />
          </div>
          <div className="h-10 w-3/4 rounded-xl bg-neutral-100 mb-4" />
          <div className="h-5 w-1/3 rounded-lg bg-neutral-100 mb-10" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-neutral-50" />
            <div className="h-4 w-full rounded bg-neutral-50" />
            <div className="h-4 w-3/4 rounded bg-neutral-50" />
            <div className="h-4 w-full rounded bg-neutral-50" />
            <div className="h-4 w-5/6 rounded bg-neutral-50" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-neutral-900">Page not found</h1>
        <p className="mt-3 text-neutral-500">The article you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('post.backToHome')}
        </Link>
      </div>
    );
  }

  const readingTime = getReadingTime(post.content);
  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(
        navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' },
      )
    : null;

  return (
    <article className="page-enter">
      {/* Hero */}
      <header className="container mx-auto max-w-3xl px-4 pt-10 md:pt-16 pb-8">
        {/* Tags + Category */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {post.category && (
            <Link
              to={`/categories/${post.category.slug}`}
              className="rounded-full bg-brand-600/10 border border-brand-200 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors"
            >
              {post.category.name}
            </Link>
          )}
          {post.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full bg-neutral-100 border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600"
            >
              {tag.name}
            </span>
          ))}
        </div>

        <h1 className="font-serif text-3xl font-extrabold tracking-tight text-neutral-900 leading-tight md:text-4xl lg:text-5xl">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-neutral-500">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700 uppercase">
              {post.author.username.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-neutral-900">{post.author.username}</p>
              <p className="text-xs text-neutral-400">{t('post.writtenBy')}</p>
            </div>
          </div>
          <span className="text-neutral-200 hidden sm:inline">|</span>
          <div className="flex items-center gap-5">
            {publishedDate && (
              <span className="flex items-center gap-1.5 text-neutral-400">
                <Calendar className="h-3.5 w-3.5" />
                {publishedDate}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-neutral-400">
              <Clock className="h-3.5 w-3.5" />
              {readingTime} {t('post.minRead')}
            </span>
            <span className="flex items-center gap-1.5 text-neutral-400">
              <Eye className="h-3.5 w-3.5" />
              {post.viewCount} {t('post.views')}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-5">
          <LikeButton
            postId={post.id}
            initialCount={post._count?.likes ?? 0}
          />
        </div>
      </header>

      {/* Cover image */}
      {post.coverImage && (
        <div className="container mx-auto max-w-4xl px-4 mb-10">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full rounded-2xl object-cover max-h-[28rem] shadow-elevated"
          />
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4 pb-12">
        <MarkdownRenderer content={post.content} />
      </div>

      {/* Author card */}
      <div className="container mx-auto max-w-3xl px-4 pb-12">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 md:p-8">
          <div className="flex items-center gap-4">
            {post.author.avatar ? (
              <img src={post.author.avatar} alt="" className="h-14 w-14 rounded-2xl object-cover flex-shrink-0" />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-brand-100 flex items-center justify-center text-xl font-bold text-brand-700 uppercase flex-shrink-0">
                {post.author.username.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-semibold text-neutral-900 text-lg">{post.author.username}</p>
              {post.author.bio ? (
                <p className="text-sm text-neutral-500 mt-1">{post.author.bio}</p>
              ) : (
                <p className="text-sm text-neutral-400 mt-1">Writer on this blog</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="container mx-auto max-w-3xl px-4 pb-12">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">{t('post.relatedPosts')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedPosts.map((rp) => (
              <Link
                key={rp.id}
                to={`/posts/${rp.slug}`}
                className="group rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-300 hover:shadow-card transition-all"
              >
                {rp.coverImage && (
                  <LazyImage
                    src={rp.coverImage}
                    alt=""
                    wrapperClassName="relative w-full h-32 overflow-hidden rounded-lg mb-3"
                    className="w-full h-32 object-cover"
                  />
                )}
                <h3 className="font-semibold text-neutral-900 group-hover:text-brand-600 transition-colors line-clamp-2">
                  {rp.title}
                </h3>
                <p className="mt-1 text-xs text-neutral-400">
                  {rp.author.username}
                  {rp.tags.length > 0 && ` · ${rp.tags[0].name}`}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="container mx-auto max-w-3xl px-4 pb-16">
        <CommentSection postId={post.id} />
      </div>

      <div className="container mx-auto max-w-3xl px-4 pb-16 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('post.backToHome')}
        </Link>
      </div>
    </article>
  );
}
