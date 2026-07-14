import { useEffect, useState } from 'react';
import { List, ChevronDown } from 'lucide-react';
import type { TocItem } from '../utils/toc';
import { useTranslation } from '../i18n/context';

interface TocProps {
  items: TocItem[];
}

/** 文章目录卡片：可折叠，滚动时高亮当前章节，点击平滑跳转 */
export function Toc({ items }: TocProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (items.length === 0) return;
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el != null);
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
      history.replaceState(null, '', `#${id}`);
    }
  };

  return (
    <div className="no-print rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-semibold text-neutral-800"
      >
        <span className="flex items-center gap-1.5">
          <List className="h-4 w-4 text-neutral-500" />
          {t('post.toc')}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <nav className="mt-3">
          <ul className="space-y-1 border-l border-neutral-200">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => handleClick(e, item.id)}
                  className={`block border-l -ml-px py-1 pl-3 text-sm transition-colors ${
                    activeId === item.id
                      ? 'border-brand-600 font-medium text-brand-700'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900'
                  } ${item.level >= 3 ? 'pl-6 text-[13px]' : ''}`}
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
