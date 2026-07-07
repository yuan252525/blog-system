import { useState, useEffect, useCallback } from 'react';
import { postsApi } from '../api/posts';
import { tagsApi } from '../api/tags';
import { categoriesApi, type Category } from '../api/categories';
import { PostCard } from '../components/PostCard';
import { Pagination } from '../components/Pagination';
import { useTranslation } from '../i18n/context';
import { Search, Hash, Folder, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Post, Tag } from '../types';

interface TagWithCount extends Tag {
  postCount: number;
}

export function HomePage() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(false);

  const VISIBLE_CATEGORIES = 6;
  const VISIBLE_TAGS = 8;
  const visibleCategories = categoriesExpanded ? categories : categories.slice(0, VISIBLE_CATEGORIES);
  const visibleTags = tagsExpanded ? tags : tags.slice(0, VISIBLE_TAGS);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (selectedTag) params.tag = selectedTag;
      if (search) params.search = search;
      const res = await postsApi.getList(params);
      setPosts(res.data);
      setTotalPages(res.meta.totalPages);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, selectedTag, search]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    tagsApi.getAll().then(setTags).catch(() => {});
    categoriesApi.getAll().then(setCategories).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
      {/* Hero section */}
      <div className="mb-10 md:mb-14">
        <span className="eyebrow mb-4">FEATURED WRITING</span>
        <h1 className="font-serif text-4xl font-extrabold tracking-tight text-neutral-900 md:text-5xl">
          {t('home.heroTitle')}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-500 md:text-lg">
          {t('home.heroSubtitle')}
        </p>

        {/* Search */}
        <form onSubmit={handleSearch} className="mt-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('home.searchPlaceholder')}
              className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-50 outline-none"
            />
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Tag filter */}
          {tags.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-neutral-400 flex items-center gap-1 mr-1">
                <Hash className="h-3 w-3" />
              </span>
              <button
                onClick={() => { setSelectedTag(null); setPage(1); }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  selectedTag === null
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300 hover:text-neutral-900'
                }`}
              >
                {t('home.allPosts')}
              </button>
              {visibleTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => { setSelectedTag(tag.slug); setPage(1); }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    selectedTag === tag.slug
                      ? 'bg-neutral-900 text-white shadow-sm'
                      : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300 hover:text-neutral-900'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
              {tags.length > VISIBLE_TAGS && (
                <button
                  type="button"
                  onClick={() => setTagsExpanded(!tagsExpanded)}
                  className="rounded-full px-3.5 py-1.5 text-xs font-medium text-neutral-400 border border-dashed border-neutral-200 hover:text-neutral-600 hover:border-neutral-300 transition-all cursor-pointer inline-flex items-center gap-1"
                >
                  {tagsExpanded ? (
                    <><ChevronUp className="h-3 w-3" />{t('home.collapse')}</>
                  ) : (
                    <><ChevronDown className="h-3 w-3" />{t('home.expandTags', { count: tags.length - VISIBLE_TAGS })}</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Posts list */}
          {loading ? (
            <div className="space-y-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-neutral-100 bg-white p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-4 w-4 rounded-full bg-neutral-100" />
                    <div className="h-3 w-20 rounded-full bg-neutral-100" />
                  </div>
                  <div className="h-6 w-3/4 rounded-lg bg-neutral-100 mb-3" />
                  <div className="h-4 w-full rounded-lg bg-neutral-50 mb-2" />
                  <div className="h-4 w-2/3 rounded-lg bg-neutral-50" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="py-20 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 mb-4">
                <Search className="h-7 w-7 text-neutral-300" />
              </div>
              <p className="text-lg font-medium text-neutral-400">{t('home.noPosts')}</p>
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

        {/* Sidebar */}
        <aside className="w-full lg:w-72 flex-shrink-0">
          <div className="lg:sticky lg:top-24 space-y-5">
            {/* About card */}
            <div className="rounded-2xl border border-neutral-100 bg-white p-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-2">{t('home.aboutTitle')}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{t('home.aboutContent')}</p>
            </div>

            {/* Categories card */}
            {categories.length > 0 && (
              <div className="rounded-2xl border border-neutral-100 bg-white p-6">
                <h3 className="text-sm font-semibold text-neutral-900 mb-3">
                  <Folder className="h-3.5 w-3.5 inline mr-1.5" />
                  {t('category.title')}
                </h3>
                <div className="space-y-1">
                  {visibleCategories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/categories/${cat.slug}`}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
                    >
                      <span>{cat.name}</span>
                      <span className="text-xs text-neutral-300">{cat._count?.posts ?? 0}</span>
                    </Link>
                  ))}
                </div>
                {categories.length > VISIBLE_CATEGORIES && (
                  <button
                    type="button"
                    onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    {categoriesExpanded ? (
                      <><ChevronUp className="h-3.5 w-3.5" />{t('home.collapse')}</>
                    ) : (
                      <><ChevronDown className="h-3.5 w-3.5" />{t('home.expandAll')} ({categories.length})</>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Tags card */}
            {tags.length > 0 && (
              <div className="rounded-2xl border border-neutral-100 bg-white p-6">
                <h3 className="text-sm font-semibold text-neutral-900 mb-3">{t('home.topicsTitle')}</h3>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => { setSelectedTag(null); setPage(1); }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                      selectedTag === null
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    {t('home.allPosts')}
                  </button>
                  {tags.slice(0, 12).map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => { setSelectedTag(tag.slug); setPage(1); }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                        selectedTag === tag.slug
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                      }`}
                    >
                      {tag.name}
                      <span className="ml-1 text-neutral-300 text-[10px]">{tag.postCount}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
