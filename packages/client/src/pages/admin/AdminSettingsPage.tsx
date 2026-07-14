import { useState, useEffect } from 'react';
import { adminApi, type SiteSettings } from '../../api/admin';
import { useTranslation } from '../../i18n/context';
import { Loader2, Save } from 'lucide-react';

const empty: SiteSettings = {
  siteTitle: '',
  siteDescription: '',
  siteKeywords: '',
  contactEmail: '',
  postsPerPage: '10',
};

export function AdminSettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<SiteSettings>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminApi
      .getSettings()
      .then((s) => setSettings(s))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: keyof SiteSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const updated = await adminApi.updateSettings(settings);
      setSettings(updated);
      setSaved(true);
    } catch {
      // handled by interceptor
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof SiteSettings; labelKey: string; textarea?: boolean }[] = [
    { key: 'siteTitle', labelKey: 'admin.siteTitle' },
    { key: 'siteDescription', labelKey: 'admin.siteDescription', textarea: true },
    { key: 'siteKeywords', labelKey: 'admin.siteKeywords' },
    { key: 'contactEmail', labelKey: 'admin.contactEmail' },
    { key: 'postsPerPage', labelKey: 'admin.postsPerPage' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-neutral-900">{t('admin.settings')}</h2>

      <form onSubmit={handleSubmit} className="max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
        <div className="space-y-5">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t(f.labelKey as Parameters<typeof t>[0])}</label>
              {f.textarea ? (
                <textarea
                  value={settings[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
                />
              ) : (
                <input
                  value={settings[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('admin.saveSettings')}
          </button>
          {saved && <span className="text-sm font-medium text-emerald-600">{t('admin.saved')}</span>}
        </div>
      </form>
    </div>
  );
}
