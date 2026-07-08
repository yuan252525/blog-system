import { useRef, useState } from 'react';
import { uploadsApi } from '../api/uploads';
import { Upload, Loader2, X } from 'lucide-react';

const CROP_SIZE = 256; // 裁剪框尺寸（CSS px），需与几何计算一致
const OUTPUT_SIZE = 400; // 导出头像像素

interface AvatarCropperProps {
  imageSrc: string;
  onCancel: () => void;
  onUploaded: (url: string) => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function AvatarCropper({ imageSrc, onCancel, onUploaded }: AvatarCropperProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const dragState = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragState.current = { x: pos.x, y: pos.y, px: e.clientX, py: e.clientY };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragState.current;
    const img = imgRef.current;
    if (!d || !img || !img.naturalWidth) return;
    const ratio = Math.min(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
    const maxX = Math.max(0, (img.naturalWidth * ratio * zoom - CROP_SIZE) / 2);
    const maxY = Math.max(0, (img.naturalHeight * ratio * zoom - CROP_SIZE) / 2);
    setPos({
      x: clamp(d.x + (e.clientX - d.px), -maxX, maxX),
      y: clamp(d.y + (e.clientY - d.py), -maxY, maxY),
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragState.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  const handleConfirm = async () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) {
      setError('图片未加载');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const ratio = Math.min(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
      const baseW = img.naturalWidth * ratio;
      const baseH = img.naturalHeight * ratio;
      const left = (CROP_SIZE - baseW * zoom) / 2 + pos.x;
      const top = (CROP_SIZE - baseH * zoom) / 2 + pos.y;
      const scale = ratio * zoom;
      const sw = CROP_SIZE / scale;
      const sh = CROP_SIZE / scale;
      const sx = -left / scale;
      const sy = -top / scale;

      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('裁剪失败'))),
          'image/jpeg',
          0.92,
        ),
      );
      const res = await uploadsApi.uploadDirect(blob, `avatar-${Date.now()}.jpg`);
      onUploaded(res.url);
    } catch {
      setError('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900">裁剪头像</h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="relative mx-auto touch-none overflow-hidden rounded-2xl bg-neutral-100"
          style={{ width: CROP_SIZE, height: CROP_SIZE }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt=""
            draggable={false}
            className="absolute left-1/2 top-1/2 max-w-none select-none"
            style={{
              transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
              transformOrigin: 'center',
            }}
          />
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-white/70" />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-neutral-500">缩放</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-brand-600"
          />
        </div>

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={uploading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 上传中
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> 确认
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
