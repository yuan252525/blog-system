import { useRef, useState } from 'react';
import { ImagePlus, X, Send, Smile } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../i18n/context';
import { uploadsApi } from '../../api/uploads';
import { momentsApi } from '../../api/moments';
import { resolveAssetUrl } from '../../utils/url';
import { ImageViewer } from '../chat/ImageViewer';
import { EmojiPicker } from '../EmojiPicker';
import type { Moment } from '../../types';

const MAX_IMAGES = 9;

/** 客户端压缩图片，避免上传超大原图 */
function resizeImage(file: File, maxSize = 1080): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            resolve(
              new File([blob], file.name || `image-${Date.now()}.jpg`, {
                type: 'image/jpeg',
              }),
            );
          },
          'image/jpeg',
          0.85,
        );
      };
      img.onerror = () => resolve(file);
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

interface Props {
  onCreated: (moment: Moment) => void;
}

export function MomentComposer({ onCreated }: Props) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  // 当前放大预览的图片地址
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** 在光标处插入 emoji */
  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? content.length;
    const end = el?.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    const pos = start + emoji.length;
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    const picks = Array.from(files).slice(0, Math.max(remaining, 0));
    if (picks.length === 0) return;

    setUploading(true);
    try {
      const urls = await Promise.all(
        picks.map(async (file) => {
          const resized = await resizeImage(file);
          const res = await uploadsApi.uploadDirect(resized, resized.name);
          return res.url;
        }),
      );
      setImages((prev) => [...prev, ...urls]);
    } catch {
      // 上传失败静默忽略
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    const text = content.trim();
    if (!text && images.length === 0) return;

    setSubmitting(true);
    try {
      const moment = await momentsApi.create({ content: text, images });
      onCreated(moment);
      setContent('');
      setImages([]);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder={t('moments.composePlaceholder')}
        className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
      />

      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((raw, i) => {
            const src = resolveAssetUrl(raw) ?? '';
            return (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-md border border-line"
              >
                <img
                  src={src}
                  alt=""
                  className="h-full w-full cursor-pointer object-cover"
                  onClick={() => src && setPreviewSrc(src)}
                />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                  aria-label={t('common.delete')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmoji((v) => !v)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 ${
                showEmoji ? 'text-brand-600' : 'text-neutral-500 hover:text-brand-600'
              }`}
            >
              <Smile className="h-4 w-4" />
              {t('moments.emoji')}
            </button>
            {showEmoji && (
              <EmojiPicker
                onSelect={(e) => insertEmoji(e)}
                onClose={() => setShowEmoji(false)}
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES || uploading}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ImagePlus className="h-4 w-4" />
            {t('moments.addImage')}
            {images.length > 0 && (
              <span className="text-xs text-neutral-400">
                ({images.length}/{MAX_IMAGES})
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || uploading || (!content.trim() && images.length === 0)}
          className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          {uploading
            ? t('moments.uploading')
            : submitting
              ? t('moments.publishing')
              : t('moments.publish')}
        </button>
      </div>
      {previewSrc && (
        <ImageViewer src={previewSrc} alt="" onClose={() => setPreviewSrc(null)} />
      )}
    </div>
  );
}
