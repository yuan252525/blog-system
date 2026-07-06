import { useMemo, useState } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  {
    name: '😀',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😋', '😛', '😜', '🤪'],
  },
  {
    name: '👍',
    emojis: ['👍', '👎', '👏', '🙌', '🤝', '💪', '✌️', '🤞', '🤟', '👌', '🤌', '🤏', '👆', '👇', '👈', '👉', '🖐️', '✋', '🤚', '👋'],
  },
  {
    name: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️'],
  },
  {
    name: '🎉',
    emojis: ['🎉', '🎊', '🎈', '🎂', '🎁', '🎀', '🏆', '🥇', '⭐', '🌟', '✨', '🔥', '💯', '✅', '❌', '⚠️', '🚀', '💡', '📌', '🔔'],
  },
  {
    name: '🐱',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄'],
  },
  {
    name: '🍕',
    emojis: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🍩', '🍪', '🎂', '🍰', '🍫', '🍬', '🍭', '🍦', '🍨', '☕', '🍵', '🥤', '🧃', '🍺'],
  },
];

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);

  const categories = useMemo(() => EMOJI_CATEGORIES, []);

  return (
    <div className="w-72 rounded-xl border border-neutral-200 bg-white shadow-xl p-3">
      {/* Category tabs */}
      <div className="flex gap-0.5 mb-2 pb-2 border-b border-neutral-100">
        {categories.map((cat, idx) => (
          <button
            key={idx}
            onClick={() => setActiveCategory(idx)}
            className={`flex-1 h-8 flex items-center justify-center rounded-lg text-sm transition-colors cursor-pointer ${
              activeCategory === idx
                ? 'bg-neutral-100'
                : 'hover:bg-neutral-50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        {categories[activeCategory].emojis.map((emoji, idx) => (
          <button
            key={`${activeCategory}-${idx}`}
            onClick={() => onSelect(emoji)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-lg hover:bg-neutral-100 transition-colors cursor-pointer leading-none"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
