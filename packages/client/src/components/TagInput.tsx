import { useState } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      const newTag = input.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInput('');
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 transition-all focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-50 min-h-[44px]">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-lg bg-brand-50 border border-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="inline-flex items-center justify-center rounded-md p-0.5 hover:bg-brand-100 transition-colors cursor-pointer"
            aria-label={`Remove ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? 'Add tags... (press Enter)' : 'Add more...'}
        className="flex-1 min-w-[140px] border-none bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-300"
      />
    </div>
  );
}
