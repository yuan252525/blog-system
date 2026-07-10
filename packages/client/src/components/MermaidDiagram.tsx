import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let initialized = false;
function ensureInit(): void {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    securityLevel: 'strict',
    fontFamily: 'inherit',
  });
  initialized = true;
}

interface MermaidDiagramProps {
  code: string;
}

const TB_BTN =
  'flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900';

// 将 ```mermaid 代码块渲染为 SVG 流程图，并提供缩放/全屏/下载等交互
export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgText, setSvgText] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    ensureInit();
    let cancelled = false;
    const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (cancelled) return;
        setSvgText(svg);
        setScale(1);
        if (svgRef.current) svgRef.current.innerHTML = svg;
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  if (error) {
    return (
      <pre className="overflow-x-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
        {code}
      </pre>
    );
  }

  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 5));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.2));
  const reset = () => setScale(1);

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => undefined);
    } else {
      document.exitFullscreen?.().catch(() => undefined);
    }
  };

  // 在新标签页打开 SVG
  const openInNewTab = () => {
    if (!svgText) return;
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  // 下载为 SVG / PNG
  const download = (type: 'svg' | 'png') => {
    if (!svgText) return;
    if (type === 'svg') {
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, 'diagram.svg');
      URL.revokeObjectURL(url);
      return;
    }
    // PNG：把 SVG 绘制到 canvas
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const w = img.width || 800;
      const h = img.height || 600;
      const scaleFactor = 2; // 提升清晰度
      const canvas = document.createElement('canvas');
      canvas.width = w * scaleFactor;
      canvas.height = h * scaleFactor;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scaleFactor, scaleFactor);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        triggerDownload(pngUrl, 'diagram.png');
        URL.revokeObjectURL(pngUrl);
      }, 'image/png');
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  return (
    <div
      ref={wrapRef}
      className={`group relative my-6 flex flex-col rounded-xl border border-neutral-200 bg-white ${
        isFullscreen ? 'h-screen w-screen' : ''
      }`}
    >
      {/* 工具栏：悬浮显示，全屏时常驻 */}
      <div
        className={`absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg border border-neutral-200 bg-white/90 p-1 shadow-sm backdrop-blur transition-opacity ${
          isFullscreen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <button type="button" className={TB_BTN} title="缩小" onClick={zoomOut}>
          −
        </button>
        <button
          type="button"
          className={`${TB_BTN} cursor-default`}
          title="当前缩放"
          onClick={reset}
        >
          {Math.round(scale * 100)}%
        </button>
        <button type="button" className={TB_BTN} title="放大" onClick={zoomIn}>
          +
        </button>
        <span className="mx-0.5 h-4 w-px bg-neutral-200" />
        <button type="button" className={TB_BTN} title="下载 PNG" onClick={() => download('png')}>
          PNG
        </button>
        <button type="button" className={TB_BTN} title="下载 SVG" onClick={() => download('svg')}>
          SVG
        </button>
        <button type="button" className={TB_BTN} title="新窗口打开" onClick={openInNewTab}>
          ↗
        </button>
        <button type="button" className={TB_BTN} title="全屏" onClick={toggleFullscreen}>
          ⛶
        </button>
      </div>

      {/* 画布区：支持缩放与滚动 */}
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        <div
          ref={svgRef}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            transition: 'transform 0.15s ease-out',
          }}
          className="[&_svg]:max-w-none"
        />
      </div>
    </div>
  );
}

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
