import { resolveAssetUrl } from '../utils/url';

interface AvatarUser {
  username: string;
  avatar: string | null;
}

interface AvatarProps {
  user: AvatarUser;
  size?: number;
  className?: string;
}

export function Avatar({ user, size = 40, className = '' }: AvatarProps) {
  const dimension = { width: size, height: size };

  if (user.avatar) {
    return (
      <img
        src={resolveAssetUrl(user.avatar) ?? ''}
        alt={user.username}
        style={dimension}
        className={`shrink-0 rounded-md object-cover ${className}`}
      />
    );
  }

  return (
    <div
      style={dimension}
      className={`grid shrink-0 place-items-center rounded-md bg-neutral-900 text-sm font-semibold text-white ${className}`}
    >
      {user.username.charAt(0).toUpperCase()}
    </div>
  );
}
