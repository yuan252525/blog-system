import { useState, useEffect, useCallback } from 'react';
import { adminApi, type AdminUser } from '../../api/admin';
import { Pagination } from '../../components/Pagination';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useTranslation } from '../../i18n/context';
import { useAuth } from '../../hooks/useAuth';
import { Shield, Ban, Trash2, Loader2, Search, CheckCircle, XCircle } from 'lucide-react';

export function AdminUsersPage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      const res = await adminApi.listUsers(params);
      setUsers(res.data);
      setTotalPages(res.meta.totalPages);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUser = async (id: string, data: { role?: 'USER' | 'ADMIN'; status?: 'ACTIVE' | 'BANNED' }, rollback?: () => void) => {
    setBusyId(id);
    try {
      const updated = await adminApi.updateUser(id, data);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
    } catch {
      rollback?.();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setBusyId(deleteConfirm.id);
    try {
      await adminApi.deleteUser(deleteConfirm.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch {
      // handled by interceptor
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-neutral-900">{t('admin.users')}</h2>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('admin.searchUser')}
            className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-400"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="py-16 text-center font-medium text-neutral-400">{t('common.noData')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  <th className="px-5 py-3.5">{t('auth.username')}</th>
                  <th className="px-5 py-3.5">{t('admin.role')}</th>
                  <th className="px-5 py-3.5">{t('admin.status')}</th>
                  <th className="px-5 py-3.5 hidden md:table-cell">{t('gamification.points')}</th>
                  <th className="px-5 py-3.5 hidden lg:table-cell">{t('admin.postsCount')}</th>
                  <th className="px-5 py-3.5 text-right">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const busy = busyId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-neutral-50/50">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-neutral-900">{u.username}</div>
                        <div className="text-xs text-neutral-400">{u.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                          u.role === 'ADMIN' ? 'bg-brand-50 text-brand-700' : 'bg-neutral-100 text-neutral-500'
                        }`}>{u.role}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                          u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {u.status === 'ACTIVE' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {u.status === 'ACTIVE' ? t('admin.active') : t('admin.banned')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-neutral-600 hidden md:table-cell">{u.points}</td>
                      <td className="px-5 py-3.5 text-neutral-600 hidden lg:table-cell">{u._count.posts}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {isSelf ? (
                            <span className="text-xs text-neutral-300">{t('nav.signedInAs')}</span>
                          ) : (
                            <>
                              <button
                                disabled={busy}
                                onClick={() => updateUser(u.id, { role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' })}
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                                title={u.role === 'ADMIN' ? t('admin.demote') : t('admin.promote')}
                              >
                                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => updateUser(u.id, { status: u.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE' })}
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50"
                                title={u.status === 'ACTIVE' ? t('admin.ban') : t('admin.unban')}
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => setDeleteConfirm(u)}
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title={t('admin.users')}
        description={`${deleteConfirm?.username} — ${t('common.delete')}?`}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
