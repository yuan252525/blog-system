import { useState, useEffect, useCallback } from 'react';
import { adminApi, type AdminCategory } from '../../api/admin';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useTranslation } from '../../i18n/context';
import { Trash2, Pencil, Plus, Loader2, FolderTree } from 'lucide-react';

export function AdminCategoriesPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminCategory | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await adminApi.listCategories());
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
    setDescription('');
  };

  const startEdit = (c: AdminCategory) => {
    setEditing(c);
    setName(c.name);
    setDescription(c.description ?? '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await adminApi.updateCategory(editing.id, { name, description });
        setCategories((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...updated } : c)));
      } else {
        const created = await adminApi.createCategory({ name, description });
        setCategories((prev) => [...prev, created]);
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
      await adminApi.deleteCategory(deleteConfirm.id);
      setCategories((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch {
      // handled by interceptor
    }
  };

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-neutral-900">{t('admin.categories')}</h2>

      <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('admin.categoryName')}
            className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('admin.categoryDescription')}
            className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editing ? t('common.edit') : t('admin.addCategory')}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="rounded-xl px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100">
              {t('common.cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="rounded-2xl border border-neutral-200 bg-white shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center">
            <FolderTree className="mx-auto mb-2 h-6 w-6 text-neutral-300" />
            <p className="font-medium text-neutral-400">{t('common.noData')}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">
                <th className="px-5 py-3.5">{t('admin.categoryName')}</th>
                <th className="px-5 py-3.5 hidden md:table-cell">{t('admin.categoryDescription')}</th>
                <th className="px-5 py-3.5">{t('admin.categoryPostCount')}</th>
                <th className="px-5 py-3.5 text-right">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50/50">
                  <td className="px-5 py-3.5 font-medium text-neutral-900">{c.name}</td>
                  <td className="px-5 py-3.5 text-neutral-500 hidden md:table-cell">{c.description ?? '—'}</td>
                  <td className="px-5 py-3.5 text-neutral-600">{c._count.posts}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => startEdit(c)} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(c)} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title={t('admin.categories')}
        description={`${deleteConfirm?.name} — ${t('common.delete')}?`}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
