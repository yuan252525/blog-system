import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { postsApi } from '../../api/posts';
import { categoriesApi, type Category } from '../../api/categories';
import { TagInput } from '../../components/TagInput';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import { PdfUploader } from '../../components/PdfUploader';
import { ImageUploader } from '../../components/ImageUploader';
import { useTranslation } from '../../i18n/context';
import { getErrorMessage } from '../../utils/error';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import type { Post, PostStatus } from '../../types';

export function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<PostStatus>('DRAFT');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      postsApi.getList({ page: 1, limit: 100 }),
      categoriesApi.getAll(),
    ])
      .then(([res, cats]) => {
        setCategories(cats);
        const post = res.data.find((p: Post) => p.id === id);
        if (post) {
          setTitle(post.title);
          setContent(post.content);
          setSummary(post.summary ?? '');
          setCoverImage(post.coverImage ?? '');
          setPdfUrl(post.pdfUrl ?? '');
          setTags(post.tags.map((tag) => tag.name));
          setStatus(post.status);
          setCategoryId(post.category?.id ?? '');
        } else {
          setNotFound(true);
        }
      })
      .catch(() => { setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !title.trim() || !content.trim()) return;
    setSaving(true);
    setError('');
    try {
      await postsApi.update(id, {
        title: title.trim(),
        content,
        summary: summary.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        pdfUrl: pdfUrl.trim() || undefined,
        status,
        tags,
        categoryId: categoryId || undefined,
      });
      navigate('/admin/posts');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="animate-pulse space-y-5">
          <div className="h-8 w-1/4 rounded-xl bg-neutral-100" />
          <div className="h-12 w-full rounded-xl bg-neutral-100" />
          <div className="h-6 w-1/2 rounded-lg bg-neutral-100" />
          <div className="h-80 w-full rounded-2xl bg-neutral-100" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-neutral-900">Post not found</h1>
        <Link
          to="/admin/posts"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to posts
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('admin.editPost')}</h1>
          <Link
            to="/admin/posts"
            className="inline-flex items-center gap-1.5 mt-1 text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to posts
          </Link>
        </div>
        <button
          form="edit-post-form"
          type="submit"
          disabled={saving || !title.trim() || !content.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 transition-all cursor-pointer"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> {t('editor.saving')}</>
          ) : (
            <><Save className="h-4 w-4" /> {status === 'PUBLISHED' ? t('editor.publish') : t('editor.saveDraft')}</>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form id="edit-post-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('editor.titlePlaceholder')}
          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3.5 text-xl font-semibold text-neutral-900 placeholder:text-neutral-300 transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-50 outline-none"
        />

        {/* Summary */}
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={t('editor.summaryPlaceholder')}
          rows={2}
          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 placeholder:text-neutral-300 transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-50 outline-none resize-none"
        />

        {/* Cover image */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">{t('editor.coverImage')}</label>
          <ImageUploader
            value={coverImage}
            onChange={setCoverImage}
            onUploadComplete={(url) => setCoverImage(url)}
          />
        </div>

        {/* PDF 附件上传 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">{t('editor.pdfAttachment')}</label>
          <PdfUploader value={pdfUrl} onChange={setPdfUrl} />
        </div>

        {/* Markdown Editor */}
        <MarkdownEditor
          value={content}
          onChange={setContent}
          placeholder={t('editor.contentPlaceholder')}
          label={t('editor.content')}
        />

        {/* Tags, Category & Status row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">{t('editor.tags')}</label>
            <TagInput tags={tags} onChange={setTags} />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">{t('editor.category')}</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-700 transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-50 outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23737373%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10"
            >
              <option value="">{t('editor.selectCategory')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">{t('editor.status')}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PostStatus)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-700 transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-50 outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23737373%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10"
            >
              <option value="DRAFT">{t('post.draft')}</option>
              <option value="PUBLISHED">{t('post.published')}</option>
              <option value="ARCHIVED">{t('post.archived')}</option>
            </select>
          </div>
        </div>
      </form>
    </div>
  );
}
