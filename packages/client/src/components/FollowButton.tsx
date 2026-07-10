import { useState } from 'react';
import { UserPlus, UserCheck } from 'lucide-react';
import { useTranslation } from '../i18n/context';
import { followApi } from '../api/follow';

export function FollowButton({
  username,
  isFollowing,
  onToggle,
}: {
  username: string;
  isFollowing: boolean;
  onToggle?: (following: boolean) => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (isFollowing) {
        await followApi.unfollow(username);
      } else {
        await followApi.follow(username);
      }
      onToggle?.(!isFollowing);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isFollowing
          ? 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
          : 'bg-brand-600 text-white hover:bg-brand-700'
      }`}
    >
      {isFollowing ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {isFollowing ? t('follow.following') : t('follow.follow')}
    </button>
  );
}
