import apiClient from './client';
import type {
  InitUploadRequest,
  InitUploadResponse,
  ChunkUploadRequest,
  UploadRecord,
} from '../types';

export const uploadsApi = {
  /** 初始化上传 */
  initUpload: (data: InitUploadRequest) =>
    apiClient.post<unknown, InitUploadResponse>('/uploads', data),

  /** 上传单个分片 */
  uploadChunk: (uploadId: string, chunkData: ChunkUploadRequest, file: Blob) => {
    const formData = new FormData();
    const blob = file instanceof Blob ? file : new Blob([file]);
    formData.append('chunk', blob);
    formData.append('chunkIndex', String(chunkData.chunkIndex));
    formData.append('size', String(chunkData.size));
    formData.append('hash', chunkData.hash);

    return apiClient.post<unknown, { chunkIndex: number; uploaded: boolean; uploadedBytes: number }>(
      `/uploads/${uploadId}/chunks`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
  },

  /** 获取上传状态 */
  getStatus: (uploadId: string) =>
    apiClient.get<unknown, UploadRecord>(`/uploads/${uploadId}`),

  /** 列出用户所有上传 */
  listUploads: (params?: { status?: string }) =>
    apiClient.get<unknown, UploadRecord[]>('/uploads', { params }),

  /** 完成上传（合并分片） */
  completeUpload: (uploadId: string) =>
    apiClient.post<unknown, { uploadId: string; url: string }>(
      `/uploads/${uploadId}/complete`,
    ),

  /** 取消上传 */
  cancelUpload: (uploadId: string) =>
    apiClient.delete<unknown, { uploadId: string; message: string }>(
      `/uploads/${uploadId}`,
    ),
};
