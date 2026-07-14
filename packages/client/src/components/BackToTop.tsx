import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/** 全局「回到顶部」悬浮按钮：滚动超过一屏后出现，点击平滑回到顶部 */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      title="回到顶部"
      className="no-print fixed bottom-6 right-6 z-50 grid h-11 w-11 place-items-center rounded-full bg-neutral-900/90 text-white shadow-lg backdrop-blur transition-all hover:bg-neutral-900 hover:scale-105 active:scale-95"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
