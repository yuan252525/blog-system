import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { likesApi } from '../api/likes';
import { useAuth } from '../hooks/useAuth';

interface LikeButtonProps {
  postId: string;
  initialLiked?: boolean;
  initialCount?: number;
}

export function LikeButton({ postId, initialLiked = false, initialCount = 0 }: LikeButtonProps) {
  const { isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    likesApi.getStatus(postId).then((res: { liked: boolean; count: number }) => {
      setLiked(res.liked);
      setCount(res.count);
    }).catch(() => {});
  }, [postId]);

  const handleToggle = async () => {
    if (!isAuthenticated) return;
    setAnimating(true);
    try {
      const res: { liked: boolean } = await likesApi.toggle(postId);
      setLiked(res.liked);
      setCount((prev) => (res.liked ? prev + 1 : Math.max(0, prev - 1)));
    } catch {
      // silent fail
    }
    setTimeout(() => setAnimating(false), 300);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={!isAuthenticated}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all cursor-pointer ${
        !isAuthenticated
          ? 'text-neutral-400 cursor-default'
          : liked
            ? 'text-red-500 bg-red-50 hover:bg-red-100'
            : 'text-neutral-500 bg-neutral-50 hover:bg-neutral-100 hover:text-red-400'
      }`}
    >
      <Heart
        className={`h-4 w-4 transition-all ${animating ? 'scale-125' : ''} ${
          liked ? 'fill-current' : ''
        }`}
      />
      <span>{count}</span>
    </button>
  );
}
