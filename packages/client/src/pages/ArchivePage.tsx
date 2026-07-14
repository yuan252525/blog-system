import { useState, useEffect } from 'react';
import { postsApi } from '../api/posts';
import { useTranslation } from '../i18n/context';
import { Link } from 'react-router-dom';
import { CalendarDays, Eye } from 'lucide-react';
import type { ArchiveGroup } from '../types';

export function ArchivePage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<ArchiveGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    postsApi
      .getArchive()
      .then(setGroups)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const monthLabel = (year: number, month: number) =>
    new Date(year, month - 1, 1).toLocaleDateString(
      navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US',
      { month: 'long' },
    );

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 md:py-16">
      <h1 className="font-serif text-3xl font-extrabold tracking-tight text-neutral-900 md:text-4xl">
        {t('archive.title')}
      </h1>
      <p className="mt-2 text-neutral-500">{t('archive.subtitle')}</p>

      {loading ? (
        <div className="mt-10 animate-pulse space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-neutral-100" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="mt-10 text-neutral-400">{t('archive.empty')}</p>
      ) : (
        <div className="mt-10 space-y-10">
          {groups.map((group) => (
            <section key={group.year}>
              <h2 className="font-serif text-2xl font-bold text-neutral-900 mb-4">{group.year}</h2>
              <div className="space-y-6">
                {group.months.map((m) => (
                  <div key={m.yearMonth}>
                    <h3 className="text-sm font-semibold text-neutral-500 mb-3 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      {monthLabel(m.year, m.month)} · {m.count}
                    </h3>
                    <ul className="space-y-2 border-l border-neutral-200 pl-4">
                      {m.posts.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3">
                          <Link
                            to={`/posts/${p.slug}`}
                            className="text-neutral-700 hover:text-brand-600 transition-colors line-clamp-1"
                          >
                            {p.title}
                          </Link>
                          <span className="flex items-center gap-1 text-xs text-neutral-400 flex-shrink-0">
                            <Eye className="h-3 w-3" />
                            {p.viewCount}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
