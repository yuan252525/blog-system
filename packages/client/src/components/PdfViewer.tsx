import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../i18n/context';
import { resolveAssetUrl } from '../utils/url';
import { AlertCircle } from 'lucide-react';

interface PdfViewerProps {
  url: string;
  fileName?: string;
}

// 模块级缓存 service，避免重复创建 IndexedDB 实例
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedService: any = null;

export function PdfViewer({ url, fileName }: PdfViewerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const absUrl = resolveAssetUrl(url) ?? url;

  useEffect(() => {
    if (!containerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mounted: any = null;
    let cancelled = false;
    setError(null);

    (async () => {
      try {
        await import('jit-pdf/styles.css');
        const { createIndexedDbPdfEditorService, mountJitPdfEditor } = await import(
          'jit-pdf/browser'
        );
        if (cancelled || !containerRef.current) return;

        if (!cachedService) {
          cachedService = createIndexedDbPdfEditorService({
            databaseName: 'jit-pdf-post-preview',
          });
        }
        const service = cachedService;

        // 自己 fetch 成 Blob，再走 local 源挂载。
        // 原因：jit-pdf 的 `url` 加载器在走「后端代理 MinIO 签名地址」时会卡死，
        // 自建 Blob 并经由它自己的 service 管线（uploadFile -> local 源）最稳定。
        // credentials: 'include' 保证接口即使需鉴权也能取到。
        const resp = await fetch(absUrl, { credentials: 'include' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const file = new File([blob], fileName || 'document.pdf', {
          type: blob.type || 'application/pdf',
        });
        const { id: fileId } = await service.uploadFile(file);
        if (cancelled || !containerRef.current) return;

        mounted = mountJitPdfEditor({
          target: containerRef.current,
          source: { type: 'local', fileId, name: fileName || 'document.pdf' },
          service,
          locale: 'zh-CN',
          theme: 'blue-enterprise',
          readonly: true,
          onLoadError: () => {
            if (!cancelled) setError(t('post.pdfLoadFailed'));
          },
        } as never);
      } catch {
        if (!cancelled) setError(t('post.pdfLoadFailed'));
      }
    })();

    return () => {
      cancelled = true;
      try {
        mounted?.unmount();
      } catch {
        // ignore
      }
    };
  }, [absUrl, fileName, t]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-500">
        <AlertCircle className="h-10 w-10 text-neutral-400" />
        <p className="text-sm">{error}</p>
        <a
          href={absUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-brand-600 hover:underline"
        >
          {t('post.downloadPdf')}
        </a>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
