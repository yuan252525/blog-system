import { useState, useCallback, useRef } from 'react';
import { uploadsApi } from '../api/uploads';
import type { InitUploadResponse, UploadRecord } from '../types';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk
const UPLOAD_STATE_KEY = 'resumable_uploads';

/** localStorage 中存储的单个上传任务状态 */
export interface UploadTask {
  uploadId: string;
  filename: string;
  mimeType: string;
  totalSize: number;
  totalChunks: number;
  /** 任务级别状态：idle | uploading | paused | completed | error */
  status: 'idle' | 'uploading' | 'paused' | 'completed' | 'error';
  /** 服务器已确认的分片索引集合 */
  uploadedChunks: number[];
  /** 页面刷新后重新获取的最新状态 */
  currentRecord?: UploadRecord;
  /** 最终访问 URL */
  url?: string;
  /** 错误消息 */
  error?: string;
}

/** 所有上传任务的持久化状态 */
interface PersistedState {
  tasks: Record<string, UploadTask>;
}

/** 计算单个分片 SHA-256 哈希 */
async function computeChunkHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

/** 读取 localStorage */
function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(UPLOAD_STATE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : { tasks: {} };
  } catch {
    return { tasks: {} };
  }
}

/** 写入 localStorage */
function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable
  }
}

export interface UseResumableUploadReturn {
  tasks: Record<string, UploadTask>;
  addFile: (file: File) => Promise<string>;
  pauseUpload: (uploadId: string) => void;
  resumeUpload: (uploadId: string) => Promise<void>;
  cancelUpload: (uploadId: string) => Promise<void>;
  removeTask: (uploadId: string) => void;
  progress: (uploadId: string) => number;
}

export function useResumableUpload(): UseResumableUploadReturn {
  const [tasks, setTasks] = useState<Record<string, UploadTask>>(() => loadState().tasks);

  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  /** 持久化状态变更 */
  const persist = useCallback((newTasks: Record<string, UploadTask>) => {
    saveState({ tasks: newTasks });
    setTasks(newTasks);
  }, []);

  /** 更新单个任务 */
  const updateTask = useCallback(
    (uploadId: string, patch: Partial<UploadTask>) => {
      const prev = loadState().tasks;
      const updated = { ...prev, [uploadId]: { ...prev[uploadId], ...patch } };
      persist(updated);
    },
    [persist],
  );

  /** 添加文件，开始上传流程 */
  const addFile = useCallback(
    async (file: File) => {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      // 初始化上传
      const initData = await uploadsApi.initUpload({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        totalSize: file.size,
        totalChunks,
      });

      const task: UploadTask = {
        uploadId: initData.uploadId,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        totalSize: file.size,
        totalChunks,
        status: 'uploading',
        uploadedChunks: [],
      };

      const prev = loadState().tasks;
      persist({ ...prev, [initData.uploadId]: task });

      // 开始上传
      const controller = new AbortController();
      abortControllers.current.set(initData.uploadId, controller);

      await uploadChunks(initData, file, controller.signal, (patch) =>
        updateTask(initData.uploadId, patch),
      );
      return initData.uploadId;
    },
    [persist, updateTask],
  );

  /** 上传所有未上传的分片 */
  async function uploadChunks(
    initData: InitUploadResponse,
    file: File,
    signal: AbortSignal,
    onUpdate: (patch: Partial<UploadTask>) => void,
  ): Promise<void> {
    const uploadedSet = new Set(initData.chunks.filter((c) => c.uploaded).map((c) => c.chunkIndex));

    // 从服务器获取最新已上传状态（用于断点续传）
    try {
      const status = await uploadsApi.getStatus(initData.uploadId);
      status.uploadedChunks.forEach((i) => uploadedSet.add(i));
      onUpdate({ uploadedChunks: [...uploadedSet], currentRecord: status });
    } catch {
      // 忽略，获取失败则用本地状态继续
    }

    for (let i = 0; i < initData.totalChunks; i++) {
      if (signal.aborted) break;
      if (uploadedSet.has(i)) continue;

      // 读取分片
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunkBlob = file.slice(start, end);

      const hash = await computeChunkHash(chunkBlob);

      try {
        await uploadsApi.uploadChunk(initData.uploadId, { chunkIndex: i, size: end - start, hash }, chunkBlob);

        uploadedSet.add(i);

        onUpdate({ uploadedChunks: [...uploadedSet] });
      } catch (err) {
        const error = err instanceof Error ? err.message : '上传失败';
        onUpdate({ status: 'error', error });
        return;
      }
    }

    if (signal.aborted) return;

    // 所有分片上传完毕，触发合并
    try {
      const result = await uploadsApi.completeUpload(initData.uploadId);
      onUpdate({ status: 'completed', url: result.url });
    } catch (err) {
      const error = err instanceof Error ? err.message : '合并失败';
      onUpdate({ status: 'error', error });
    }
  }

  /** 暂停上传（通过 AbortController 中止） */
  const pauseUpload = useCallback((uploadId: string) => {
    const controller = abortControllers.current.get(uploadId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(uploadId);
    }
    updateTask(uploadId, { status: 'paused' });
  }, [updateTask]);

  /** 恢复上传（从断点继续） */
  const resumeUpload = useCallback(async (uploadId: string) => {
    const task = loadState().tasks[uploadId];
    if (!task) return;

    const controller = new AbortController();
    abortControllers.current.set(uploadId, controller);

    updateTask(uploadId, { status: 'uploading', error: undefined });

    // 获取服务器状态（包含断点信息）
    const status = await uploadsApi.getStatus(uploadId);
    const uploadedSet = new Set(status.uploadedChunks);
    updateTask(uploadId, { uploadedChunks: [...uploadedSet], currentRecord: status });

    // 重新获取文件并继续上传
    // 注意：前端无法直接恢复，因为刷新后 File 对象丢失
    // 恢复时用户需要重新选择相同文件
    // 这里提示用户重新选择文件
    updateTask(uploadId, {
      status: 'paused',
      error: '请重新选择同一文件以继续上传',
    });
  }, [updateTask]);

  /** 取消上传 */
  const cancelUpload = useCallback(
    async (uploadId: string) => {
      const controller = abortControllers.current.get(uploadId);
      if (controller) {
        controller.abort();
        abortControllers.current.delete(uploadId);
      }

      try {
        await uploadsApi.cancelUpload(uploadId);
      } catch {
        // 忽略，服务器端可能已经清理
      }

      const prev = loadState().tasks;
      const { [uploadId]: _, ...rest } = prev;
      persist(rest);
    },
    [persist],
  );

  /** 移除任务记录（不清除服务器端，仅清除本地） */
  const removeTask = useCallback(
    (uploadId: string) => {
      const controller = abortControllers.current.get(uploadId);
      if (controller) {
        controller.abort();
        abortControllers.current.delete(uploadId);
      }

      const prev = loadState().tasks;
      const { [uploadId]: _, ...rest } = prev;
      persist(rest);
    },
    [persist],
  );

  /** 计算进度百分比 */
  const progress = useCallback(
    (uploadId: string) => {
      const task = tasks[uploadId];
      if (!task) return 0;
      return task.uploadedChunks.length / task.totalChunks;
    },
    [tasks],
  );

  return { tasks, addFile, pauseUpload, resumeUpload, cancelUpload, removeTask, progress };
}
