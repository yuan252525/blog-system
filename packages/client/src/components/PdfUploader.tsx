import { useCallback, useEffect, useRef, useState } from 'react';
import { useResumableUpload } from '../hooks/useResumableUpload';
import { useTranslation } from '../i18n/context';
import { FileText, X, Upload, Loader2 } from 'lucide-react';

interface PdfUploaderProps {
  value?: string;
  onChange?: (url: string) => void;
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export function PdfUploader({ value, onChange }: PdfUploaderProps) {
  const { t } = useTranslation();
  const { tasks, addFile, cancelUpload, removeTask, progress } = useResumableUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const myUploadId = useRef<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const file = files[0];
      if (!isPdf(file)) {
        alert(t('editor.invalidPdf'));
        return;
      }
      setFileName(file.name);
      const id = await addFile(file);
      myUploadId.current = id;
    },
    [addFile, t],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  // 上传完成后回填 url
  useEffect(() => {
    const id = myUploadId.current;
    if (!id) return;
    const task = tasks[id];
    if (task?.status === 'completed' && task.url && task.url !== value) {
      onChange?.(task.url);
    }
  }, [tasks, value, onChange]);

  const myTask = myUploadId.current ? tasks[myUploadId.current] : undefined;
  const uploading = myTask && myTask.status !== 'completed' && myTask.status !== 'error';

  const handleRemove = useCallback(() => {
    if (myUploadId.current) removeTask(myUploadId.current);
    myUploadId.current = null;
    setFileName('');
    onChange?.('');
  }, [onChange, removeTask]);

  return (
    <div className="space-y-3">
      {/* 已上传的 PDF 卡片 */}
      {value && !uploading && (
        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
          <FileText className="h-8 w-8 flex-shrink-0 text-brand-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-800">
              {fileName || t('editor.pdfUploaded')}
            </p>
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:underline"
            >
              {t('post.downloadPdf')}
            </a>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="cursor-pointer rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-red-500"
            title={t('editor.replacePdf')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 上传进度 */}
      {uploading && myTask && (
        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-800">{fileName}</p>
              <span className="text-xs text-neutral-500">
                {Math.round(progress(myTask.uploadId) * 100)}%
              </span>
            </div>
            <button
              type="button"
              onClick={() => myUploadId.current && cancelUpload(myUploadId.current)}
              className="cursor-pointer rounded-full p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-red-500"
              title={t('common.cancel')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-300"
              style={{ width: `${Math.round(progress(myTask.uploadId) * 100)}%` }}
            />
          </div>
          {myTask.error && <p className="mt-1 text-xs text-red-500">{myTask.error}</p>}
        </div>
      )}

      {/* 上传入口 */}
      {!value && !uploading && (
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 transition-colors ${
            dragging ? 'border-brand-500 bg-brand-50' : 'border-neutral-300 hover:border-neutral-400'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mb-2 h-8 w-8 text-neutral-400" />
          <p className="px-4 text-center text-sm font-medium text-neutral-600">
            {t('editor.pdfUploadHint')}
          </p>
          <p className="mt-1 text-xs text-neutral-400">PDF</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>
      )}
    </div>
  );
}
