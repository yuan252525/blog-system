import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n/context';
import { gamificationApi } from '../api/gamification';
import type { LeaderboardEntry } from '../types';
import { Trophy, Medal, Crown } from 'lucide-react';

const RANK_ICON = [Crown, Medal, Medal];

export function LeaderboardPage() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    gamificationApi
      .getLeaderboard(50)
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
      <div className="mb-6 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-amber-500" />
        <h1 className="text-2xl font-bold text-neutral-900">{t('gamification.leaderboard')}</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-neutral-100 bg-white p-4">
              <div className="h-5 w-full rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="py-10 text-center text-neutral-400">{t('common.noData')}</div>
      ) : (
        <div className="space-y-3">
          {entries.map((e, idx) => {
            const Icon = RANK_ICON[idx];
            return (
              <div
                key={e.id}
                className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center">
                  {idx < 3 && Icon ? (
                    <Icon
                      className={`h-7 w-7 ${
                        idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-neutral-400' : 'text-orange-300'
                      }`}
                    />
                  ) : (
                    <span className="text-lg font-bold text-neutral-400">{idx + 1}</span>
                  )}
                </div>

                {e.avatar ? (
                  <img src={e.avatar} alt={e.username} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-lg font-bold uppercase text-brand-600">
                    {e.username.charAt(0)}
                  </div>
                )}

                <Link
                  to="/profile"
                  className="flex-1 truncate font-medium text-neutral-800 hover:text-brand-600"
                >
                  {e.username}
                </Link>

                <div className="text-right">
                  <div className="text-sm font-bold text-neutral-900">{e.points} {t('gamification.points')}</div>
                  <div className="text-xs text-neutral-400">Lv.{e.level}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
