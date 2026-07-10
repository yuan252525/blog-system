import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../i18n/context';
import { gamificationApi } from '../api/gamification';
import { Flame, Gift, CheckCircle2 } from 'lucide-react';

export function NavbarCheckIn() {
  const { user } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    gamificationApi
      .getMe()
      .then((s) => setCheckedInToday(s.checkedInToday))
      .catch(() => {});
  }, []);

  const handleCheckIn = async () => {
    if (busy || checkedInToday) return;
    setBusy(true);
    try {
      const res = await gamificationApi.checkIn();
      setCheckedInToday(true);
      if (user) setUser({ ...user, points: res.points, level: res.level });
      setFlash(t('gamification.checkInFlashShort', { points: res.gained }));
      setTimeout(() => setFlash(null), 2600);
    } catch {
      setFlash(t('gamification.alreadyCheckedIn'));
      setTimeout(() => setFlash(null), 2600);
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
      <button
        onClick={() => navigate('/profile')}
        title={t('gamification.title')}
        className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-50 sm:flex"
      >
        <span className="grid h-5 min-w-[20px] place-items-center rounded bg-brand-100 px-1 text-xs font-bold text-brand-700">
          Lv.{user.level}
        </span>
        <span className="font-medium text-neutral-700">{user.points}</span>
        <Flame
          className={`h-3.5 w-3.5 ${user.checkInStreak > 0 ? 'text-orange-500' : 'text-neutral-300'}`}
        />
      </button>

      <button
        onClick={handleCheckIn}
        disabled={checkedInToday || busy}
        title={t('gamification.checkIn')}
        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
          checkedInToday
            ? 'cursor-default bg-neutral-100 text-neutral-400'
            : 'bg-brand-600 text-white hover:bg-brand-700'
        }`}
      >
        {checkedInToday ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Gift className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">
          {checkedInToday ? t('gamification.checkedIn') : t('gamification.checkIn')}
        </span>
      </button>

      {flash && (
        <div className="absolute right-2 top-14 z-50 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-elevated">
          {flash}
        </div>
      )}
    </div>
  );
}
