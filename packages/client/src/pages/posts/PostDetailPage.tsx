import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { postsApi } from '../../api/posts';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';
import { CommentSection } from '../../components/CommentSection';
import { LikeButton } from '../../components/LikeButton';
import { LazyImage } from '../../components/LazyImage';
import { Toc } from '../../components/Toc';
import { useTranslation } from '../../i18n/context';
import { getReadingTime } from '../../utils/readingTime';
import { extractExcerpt } from '../../utils/excerpt';
import { resolveAssetUrl } from '../../utils/url';
import { buildToc, type TocItem } from '../../utils/toc';
import { addRecentPost } from '../../utils/recentPosts';
import { useSeo } from '../../hooks/useSeo';
import { Calendar, Eye, ArrowLeft, Clock, X, FileText, Link2, Printer } from 'lucide-react';
import type { Post } from '../../types';
import { PdfViewer } from '../../components/PdfViewer';
import { toast } from '../../components/ui/toast';

export function PostDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { t } = useTranslation();
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [fontScale, setFontScale] = useState<number>(() => {
    const saved = Number(localStorage.getItem('blog-reader-font'));
    return Number.isFinite(saved) && saved >= 0 && saved <= 3 ? saved : 1;
  });

  const handleCopyLink = useCallback(() => {
    navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => toast({ title: t('post.linkCopied'), variant: 'success' }))
      .catch(() => toast({ title: t('common.copyFailed'), variant: 'error' }));
  }, [t]);

  const readerFontClass = ['prose-sm', 'prose-base', 'prose-lg', 'prose-xl'][fontScale];

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
        setToc(buildToc(p.content));
        addRecentPost({
          slug: p.slug,
          title: p.title,
          coverImage: p.coverImage,
          author: p.author.username,
          viewedAt: Date.now(),
        });
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

  // 阅读进度条
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (el.scrollTop / max) * 100)) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [slug]);

  // 持久化阅读字号
  useEffect(() => {
    localStorage.setItem('blog-reader-font', String(fontScale));
  }, [fontScale]);

  // SEO / 社交分享卡片 meta
  useSeo({
    title: post?.title,
    description: post ? post.summary || extractExcerpt(post.content) : undefined,
    image: post ? resolveAssetUrl(post.coverImage) : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    type: 'article',
    publishedTime: post?.publishedAt ? post.publishedAt : undefined,
  });

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
      {/* 阅读进度条 */}
      <div className="no-print fixed inset-x-0 top-0 z-[55] h-0.5 bg-transparent">
        <div
          className="h-full bg-brand-600 transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

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
          <Link
            to={`/user/${post.author.username}`}
            className="flex items-center gap-3 hover:text-brand-600 transition-colors"
          >
            <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700 uppercase">
              {post.author.username.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-neutral-900">{post.author.username}</p>
              <p className="text-xs text-neutral-400">{t('post.writtenBy')}</p>
            </div>
          </Link>
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
        <div className="no-print mt-5 flex flex-wrap items-center gap-3">
          <LikeButton
            postId={post.id}
            initialCount={post._count?.likes ?? 0}
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-brand-400 hover:text-brand-600 cursor-pointer"
          >
            <Link2 className="h-4 w-4" />
            {t('post.copyLink')}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-brand-400 hover:text-brand-600 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            {t('post.print')}
          </button>
          <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-1.5 py-1">
            <button
              type="button"
              onClick={() => setFontScale((s) => Math.max(0, s - 1))}
              title={t('post.decreaseFont')}
              aria-label={t('post.decreaseFont')}
              className="grid h-7 w-7 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontScale(1)}
              title={t('post.resetFont')}
              aria-label={t('post.resetFont')}
              className="grid h-7 w-7 place-items-center rounded-full text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontScale((s) => Math.min(3, s + 1))}
              title={t('post.increaseFont')}
              aria-label={t('post.increaseFont')}
              className="grid h-7 w-7 place-items-center rounded-full text-base font-semibold text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              A+
            </button>
          </div>
          {post.pdfUrl && (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-brand-400 hover:text-brand-600 cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              {t('post.previewPdf')}
            </button>
          )}
        </div>
      </header>

      {/* 文章目录 */}
      {toc.length > 0 && (
        <div className="container mx-auto max-w-3xl px-4 pb-8">
          <Toc items={toc} />
        </div>
      )}

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
        <MarkdownRenderer content={post.content} sizeClass={readerFontClass} />
      </div>

      {/* Author card */}
      <div className="container mx-auto max-w-3xl px-4 pb-12">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 md:p-8">
          <Link
            to={`/user/${post.author.username}`}
            className="flex items-center gap-4 hover:opacity-80 transition-opacity"
          >
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
          </Link>
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
      {/* PDF 预览弹窗 */}
      {previewOpen && post.pdfUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-elevated min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
              <h3 className="font-semibold text-neutral-900">{t('post.pdfPreview')}</h3>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="cursor-pointer rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                title={t('common.cancel')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative flex-1 min-h-0 bg-neutral-100">
              <PdfViewer url={post.pdfUrl} fileName={post.title} />
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
