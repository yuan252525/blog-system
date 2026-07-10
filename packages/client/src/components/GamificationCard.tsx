import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../i18n/context';
import { gamificationApi } from '../api/gamification';
import type { GamificationStatus } from '../types';
import { Flame, Trophy, Star, CheckCircle2, Gift } from 'lucide-react';

export function GamificationCard() {
  const { user } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const { t } = useTranslation();
  const [status, setStatus] = useState<GamificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    gamificationApi
      .getMe()
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCheckIn = async () => {
    if (checking || status?.checkedInToday) return;
    setChecking(true);
    try {
      const res = await gamificationApi.checkIn();
      setStatus((prev) =>
        prev ? { ...prev, checkedInToday: true, streak: res.streak, points: res.points, level: res.level } : prev,
      );
      if (user) setUser({ ...user, points: res.points, level: res.level });
      setFlash(t('gamification.checkInFlash', { points: res.gained, streak: res.streak }));
      setTimeout(() => setFlash(null), 2600);
    } catch {
      setFlash(t('gamification.alreadyCheckedIn'));
      setTimeout(() => setFlash(null), 2600);
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="h-5 w-1/3 rounded bg-neutral-100" />
        <div className="mt-4 h-3 w-full rounded bg-neutral-50" />
      </div>
    );
  }

  if (!status) return null;

  const progress = Math.min(100, Math.round((status.exp / (status.exp + status.expToNext)) * 100));

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      {/* 等级 + 积分 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-white">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-900">Lv.{status.level}</span>
              <span className="text-sm text-neutral-500">{status.points} {t('gamification.points')}</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm text-orange-500">
              <Flame className="h-4 w-4" />
              <span>{t('gamification.streak')}: {status.streak} {t('gamification.days')}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleCheckIn}
          disabled={status.checkedInToday || checking}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            status.checkedInToday
              ? 'cursor-default bg-neutral-100 text-neutral-400'
              : 'bg-brand-600 text-white hover:bg-brand-700'
          }`}
        >
          {status.checkedInToday ? <CheckCircle2 className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
          {status.checkedInToday ? t('gamification.checkedIn') : t('gamification.checkIn')}
        </button>
      </div>

      {flash && (
        <div className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
          {flash}
        </div>
      )}

      {/* 经验进度条 */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>Lv.{status.level}</span>
          <span>{status.exp} / {status.exp + status.expToNext} EXP</span>
          <span>Lv.{status.level + 1}</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 徽章 */}
      <div className="mt-6">
        <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
          <Star className="h-4 w-4 text-amber-500" />
          {t('gamification.badges')}
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {status.badges.map((b) => (
            <div
              key={b.key}
              title={b.description}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors ${
                b.earned
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-neutral-100 bg-neutral-50 opacity-60'
              }`}
            >
              <span className="text-2xl">{b.icon}</span>
              <span className="text-xs font-medium text-neutral-700">{b.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
