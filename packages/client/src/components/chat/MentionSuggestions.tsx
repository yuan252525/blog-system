import { useState, useEffect, useRef } from 'react';
import { chatApi } from '../../api/chat';

interface MentionSuggestionsProps {
  query: string;
  onSelect: (user: { id: string; username: string }) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export function MentionSuggestions({ query, onSelect, onClose, position }: MentionSuggestionsProps) {
  const [users, setUsers] = useState<{ id: string; username: string; avatar?: string }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query) {
      setUsers([]);
      return;
    }

    const timer = setTimeout(() => {
      chatApi.searchUsers(query).then(setUsers).catch(() => setUsers([]));
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [users]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, users.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (users[selectedIndex]) {
          onSelect(users[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [users, selectedIndex, onSelect, onClose]);

  if (users.length === 0) return null;

  return (
    <div
      ref={ref}
      className="absolute z-50 w-56 max-h-48 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg py-1"
      style={{ bottom: '100%', left: position.left, marginBottom: 4 }}
    >
      {users.map((user, idx) => (
        <button
          key={user.id}
          onClick={() => onSelect(user)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
            idx === selectedIndex ? 'bg-brand-50 text-brand-700' : 'text-neutral-700 hover:bg-neutral-50'
          }`}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-600">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
            ) : (
              user.username[0]?.toUpperCase()
            )}
          </span>
          <span className="truncate">{user.username}</span>
        </button>
      ))}
    </div>
  );
}
