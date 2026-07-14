import { useState, useEffect, useCallback } from 'react';
import { adminApi, type AdminTag } from '../../api/admin';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useTranslation } from '../../i18n/context';
import { Trash2, Pencil, Plus, Loader2, Tags } from 'lucide-react';

export function AdminTagsPage() {
  const { t } = useTranslation();
  const [tags, setTags] = useState<AdminTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminTag | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminTag | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTags(await adminApi.listTags());
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditing(null);
    setName('');
  };

  const startEdit = (tag: AdminTag) => {
    setEditing(tag);
    setName(tag.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await adminApi.updateTag(editing.id, { name });
        setTags((prev) => prev.map((tg) => (tg.id === editing.id ? { ...tg, ...updated } : tg)));
      } else {
        const created = await adminApi.createTag({ name });
        setTags((prev) => [...prev, created]);
      }
      resetForm();
    } catch {
      // handled by interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await adminApi.deleteTag(deleteConfirm.id);
      setTags((prev) => prev.filter((tg) => tg.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch {
      // handled by interceptor
    }
  };

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-neutral-900">{t('admin.tags')}</h2>

      <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('admin.tagName')}
            className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editing ? t('common.edit') : t('admin.addTag')}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="rounded-xl px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100">
              {t('common.cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : tags.length === 0 ? (
          <div className="py-16 text-center">
            <Tags className="mx-auto mb-2 h-6 w-6 text-neutral-300" />
            <p className="font-medium text-neutral-400">{t('common.noData')}</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="group flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 py-1.5 pl-3 pr-1.5 text-sm text-neutral-700"
              >
                <span>{tag.name}</span>
                <span className="text-xs text-neutral-400">{tag._count.posts}</span>
                <button onClick={() => startEdit(tag)} className="rounded-full p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700">
                  <Pencil className="h-3 w-3" />
                </button>
                <button onClick={() => setDeleteConfirm(tag)} className="rounded-full p-1 text-neutral-400 hover:bg-red-100 hover:text-red-600">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title={t('admin.tags')}
        description={`${deleteConfirm?.name} — ${t('common.delete')}?`}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
