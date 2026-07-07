import { Link } from 'react-router-dom';
import { Calendar, Eye, Clock } from 'lucide-react';
import { useTranslation } from '../i18n/context';
import { getReadingTime } from '../utils/readingTime';
import { LazyImage } from './LazyImage';
import type { Post } from '../types';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { t } = useTranslation();
  const readingTime = getReadingTime(post.content);

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(
        navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US',
        { year: 'numeric', month: 'short', day: 'numeric' },
      )
    : t('post.draft');

  return (
    <Link
      to={`/posts/${post.slug}`}
      className="group block rounded-2xl border border-neutral-100 bg-white p-6 md:p-8 shadow-card hover:shadow-card-hover hover:border-neutral-200 transition-all duration-200"
    >
      <div className="flex gap-5">
        {/* Text content */}
        <div className="flex-1 min-w-0">
          {/* Meta row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              {post.author.avatar ? (
                <img src={post.author.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-600 uppercase">
                  {post.author.username.charAt(0)}
                </div>
              )}
              <span className="text-xs font-medium text-neutral-500">
                {post.author.username}
              </span>
            </div>
            <span className="text-neutral-200">·</span>
            <span className="text-xs text-neutral-400 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>
          </div>

          {/* Title */}
          <h2 className="font-serif text-lg font-bold text-neutral-900 line-clamp-2 leading-snug transition-colors group-hover:text-brand-600 md:text-xl">
            {post.title}
          </h2>

          {/* Summary */}
          {post.summary && (
            <p className="mt-2 text-sm text-neutral-500 line-clamp-2 leading-relaxed">
              {post.summary}
            </p>
          )}

          {/* Footer */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs text-neutral-400 flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {post.viewCount}
            </span>
            <span className="text-xs text-neutral-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {readingTime} {t('home.minRead')}
            </span>

            {post.status !== 'PUBLISHED' && (
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                post.status === 'DRAFT'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
              }`}>
                {t(post.status === 'DRAFT' ? 'post.draft' : 'post.archived')}
              </span>
            )}

            {post.category && (
              <span className="rounded-full bg-brand-50 border border-brand-100 px-2.5 py-0.5 text-[10px] font-medium text-brand-600">
                {post.category.name}
              </span>
            )}

            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 ml-auto">
                {post.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-neutral-50 border border-neutral-100 px-2.5 py-0.5 text-[10px] font-medium text-neutral-500"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cover image - lazy loaded via IntersectionObserver */}
        {post.coverImage && (
          <div className="hidden sm:block flex-shrink-0">
            <LazyImage
              src={post.coverImage}
              alt={post.title}
              wrapperClassName="relative w-28 h-20 md:w-40 md:h-28 overflow-hidden rounded-xl"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}
      </div>
    </Link>
  );
}
