import { useCallback, useEffect, useRef, useState } from 'react';
import { useResumableUpload } from '../../hooks/useResumableUpload';
import { Upload, X, Pause, Play, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  value?: string;
  onChange?: (url: string) => void;
  /** 上传完成后触发 onChange，传入 MinIO 访问 URL */
  onUploadComplete?: (url: string, uploadId: string) => void;
}

export function ImageUploader({ value, onChange, onUploadComplete }: ImageUploaderProps) {
  const { tasks, addFile, pauseUpload, resumeUpload, cancelUpload, progress } =
    useResumableUpload();

  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 当前正在上传的（非完成态）任务 */
  const activeTasks = Object.values(tasks).filter((t) => t.status !== 'completed');

  /** 已完成的任务（可作为封面图候选） */
  const completedTasks = Object.values(tasks).filter((t) => t.status === 'completed');

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }
      await addFile(file);
    },
    [addFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  // 用 ref 追踪已触发过回调的 uploadId，配合 useEffect 避免无限重渲染
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const task of completedTasks) {
      if (task.url && !notifiedRef.current.has(task.uploadId)) {
        notifiedRef.current.add(task.uploadId);
        onChange?.(task.url);
        onUploadComplete?.(task.url, task.uploadId);
      }
    }
  }, [completedTasks, onChange, onUploadComplete]);

  return (
    <div className="space-y-4">
      {/* 已选中的封面预览 */}
      {value && !activeTasks.length && (
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          <img src={value} alt="封面预览" className="w-full h-48 object-cover" />
          <button
            type="button"
            onClick={() => onChange?.('')}
            className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 上传区域 */}
      {!value && (
        <div
          className={`relative rounded-lg border-2 border-dashed transition-colors ${
            dragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <div className="flex flex-col items-center justify-center py-10 cursor-pointer">
            <ImageIcon className="w-10 h-10 text-gray-400 mb-3" />
            <p className="text-sm text-gray-600 font-medium">点击或拖拽图片到这里</p>
            <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG、WebP 等格式</p>
          </div>
        </div>
      )}

      {/* 上传任务列表 */}
      {activeTasks.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">上传进度</p>
          {activeTasks.map((task) => (
            <UploadTaskItem
              key={task.uploadId}
              task={task}
              progress={progress(task.uploadId)}
              onPause={() => pauseUpload(task.uploadId)}
              onResume={() => resumeUpload(task.uploadId)}
              onCancel={() => cancelUpload(task.uploadId)}
            />
          ))}
        </div>
      )}

      {/* 已完成的可选封面图 */}
      {completedTasks.length > 0 && !value && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">已上传的图片（点击设为封面）</p>
          <div className="grid grid-cols-4 gap-2">
            {completedTasks.map((task) =>
              task.url ? (
                <button
                  key={task.uploadId}
                  type="button"
                  onClick={() => {
                    onChange?.(task.url!);
                    onUploadComplete?.(task.url!, task.uploadId);
                  }}
                  className="relative rounded overflow-hidden border-2 border-transparent hover:border-primary-500 cursor-pointer"
                >
                  <img src={task.url} alt={task.filename} className="w-full h-16 object-cover" />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white opacity-0 hover:opacity-100" />
                  </div>
                </button>
              ) : null,
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** 单个上传任务行 */
interface UploadTaskItemProps {
  task: import('../../hooks/useResumableUpload').UploadTask;
  progress: number;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

function UploadTaskItem({ task, progress, onPause, onResume, onCancel }: UploadTaskItemProps) {
  const pct = Math.round(progress * 100);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-3">
        {/* 图标 */}
        <div className="flex-shrink-0">
          {task.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
          {task.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
          {(task.status === 'uploading' || task.status === 'idle') && (
            <Upload className="w-5 h-5 text-primary-500 animate-pulse" />
          )}
          {task.status === 'paused' && (
            <button type="button" onClick={onResume} className="cursor-pointer">
              <Play className="w-5 h-5 text-yellow-500" />
            </button>
          )}
        </div>

        {/* 文件信息和进度 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-800 truncate">{task.filename}</p>
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs text-gray-500">{pct}%</span>
              {task.status === 'uploading' && (
                <button type="button" onClick={onPause} className="cursor-pointer" title="暂停">
                  <Pause className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
              <button type="button" onClick={onCancel} className="cursor-pointer" title="取消">
                <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
              </button>
            </div>
          </div>

          {/* 进度条 */}
          <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                task.status === 'error'
                  ? 'bg-red-400'
                  : task.status === 'completed'
                    ? 'bg-green-400'
                    : 'bg-primary-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* 错误信息 */}
          {task.error && (
            <p className="mt-1 text-xs text-red-500">{task.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
