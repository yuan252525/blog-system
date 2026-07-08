import { useEffect, useRef } from 'react';

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🤔', '😅',
  '😉', '😇', '🙃', '😋', '😜', '🤩', '🥳', '😢', '😭', '😤',
  '😡', '🥺', '😴', '🤗', '🤭', '🫡', '🤠', '🥰', '😏', '😬',
  '👍', '👎', '👏', '🙌', '🙏', '👌', '✌️', '🤞', '💪', '🤝',
  '👋', '💅', '🤙', '👀', '🫶', '❤️', '🧡', '💛', '💚', '💙',
  '💜', '🖤', '🤍', '💯', '⭐', '✨', '⚡', '🔥', '🌟', '💡',
  '🎉', '🎊', '🌈', '🚀', '📌', '✅', '❌', '⚠️', '🌸', '🍀',
  '☕', '🎁', '🐱', '🐶', '🌹', '🍎', '🍕', '😺', '🍻', '💖',
];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-xl border border-line bg-surface p-3 shadow-lg"
    >
      <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto">
        {EMOJIS.map((e, i) => (
          <button
            key={`${e}-${i}`}
            type="button"
            onClick={() => onSelect(e)}
            className="flex h-8 w-8 items-center justify-center rounded text-lg transition-colors hover:bg-neutral-100 cursor-pointer"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
