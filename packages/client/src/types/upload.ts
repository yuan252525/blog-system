export type UploadStatus = 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface UploadRecord {
  uploadId: string;
  filename: string;
  mimeType: string;
  totalSize: string;
  totalChunks: number;
  uploadedBytes: string;
  uploadedChunks: number[];
  progress: number;
  status: UploadStatus;
  url: string | null;
  createdAt?: string;
}

export interface InitUploadRequest {
  filename: string;
  mimeType: string;
  totalSize: number;
  totalChunks: number;
}

export interface InitUploadResponse {
  uploadId: string;
  objectKey: string;
  totalChunks: number;
  chunks: { chunkIndex: number; uploaded: boolean }[];
}

export interface ChunkUploadRequest {
  chunkIndex: number;
  size: number;
  hash: string;
}
