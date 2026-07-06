import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { PrismaService } from '../../database/prisma.service.js';
import { InitUploadDto, QueryUploadDto } from './uploads.dto.js';
import { createHash } from 'crypto';
import type { Response } from 'express';

@Injectable()
export class UploadsService {
  private readonly minioClient: Minio.Client;
  private readonly bucket: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost')!;
    const port = this.config.get<number>('MINIO_PORT', 9000)!;
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'blog-uploads')!;
    const useSSL = this.config.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.config.get<string>('MINIO_ACCESS_KEY')!;
    const secretKey = this.config.get<string>('MINIO_SECRET_KEY')!;

    this.minioClient = new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });
  }

  /** 确保 bucket 存在，不存在则自动创建 */
  async ensureBucket(): Promise<void> {
    const exists = await this.minioClient.bucketExists(this.bucket);
    if (!exists) {
      await this.minioClient.makeBucket(this.bucket);
    }
  }

  /** 生成唯一 objectKey（用于 MinIO 存储路径） */
  private generateObjectKey(filename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 10);
    const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '';
    return `uploads/${timestamp}-${random}${ext}`;
  }

  /** 初始化上传：创建上传记录和分片记录 */
  async initUpload(dto: InitUploadDto, userId: string) {
    await this.ensureBucket();

    const objectKey = this.generateObjectKey(dto.filename);

    const upload = await this.prisma.upload.create({
      data: {
        filename: dto.filename,
        mimeType: dto.mimeType,
        totalSize: BigInt(dto.totalSize),
        totalChunks: dto.totalChunks,
        uploadedBytes: BigInt(0),
        status: 'PENDING',
        userId,
        objectKey,
      },
    });

    // 预创建分片记录（全部标记为未上传）
    const chunks = await Promise.all(
      Array.from({ length: dto.totalChunks }, async (_, i) => {
        return this.prisma.uploadChunk.create({
          data: {
            uploadId: upload.id,
            chunkIndex: i,
            size: BigInt(Math.floor(dto.totalSize / dto.totalChunks)),
            hash: '',
            uploaded: false,
          },
        });
      }),
    );

    return {
      uploadId: upload.id,
      objectKey,
      totalChunks: dto.totalChunks,
      chunks: chunks.map((c) => ({ chunkIndex: c.chunkIndex, uploaded: c.uploaded })),
    };
  }

  /** 上传单个分片到 MinIO 临时路径 */
  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunkBuffer: Buffer,
    hash: string,
    userId: string,
  ) {
    const upload = await this.prisma.upload.findUnique({
      where: { id: uploadId },
      include: { chunks: true },
    });

    if (!upload) {
      throw new NotFoundException('Upload record not found');
    }

    if (upload.userId !== userId) {
      throw new BadRequestException('Not authorized for this upload');
    }

    if (upload.status === 'CANCELLED') {
      throw new BadRequestException('Upload has been cancelled');
    }

    if (upload.status === 'COMPLETED') {
      throw new BadRequestException('Upload already completed');
    }

    // 验证分片索引范围
    if (chunkIndex < 0 || chunkIndex >= upload.totalChunks) {
      throw new BadRequestException('Invalid chunk index');
    }

    // 校验 hash（SHA-256 Base64，与前端保持一致）
    const expectedHash = createHash('sha256').update(chunkBuffer).digest('base64');
    if (hash !== expectedHash) {
      throw new BadRequestException('Chunk hash mismatch');
    }

    // 分片存储路径：临时分片目录
    const chunkObjectKey = `${upload.objectKey}/chunks/${chunkIndex}`;

    await this.minioClient.putObject(
      this.bucket,
      chunkObjectKey,
      chunkBuffer,
      chunkBuffer.length,
      { 'Content-Type': 'application/octet-stream' },
    );

    // 更新分片记录
    await this.prisma.uploadChunk.update({
      where: { uploadId_chunkIndex: { uploadId, chunkIndex } },
      data: {
        uploaded: true,
        hash,
        size: BigInt(chunkBuffer.length),
      },
    });

    // 更新上传进度
    const uploadedBytes = await this.calculateUploadedBytes(uploadId);
    await this.prisma.upload.update({
      where: { id: uploadId },
      data: {
        uploadedBytes: BigInt(uploadedBytes),
        status: 'UPLOADING',
      },
    });

    return { chunkIndex, uploaded: true, uploadedBytes };
  }

  /** 获取上传状态（已上传的分片列表） */
  async getUploadStatus(uploadId: string, userId: string) {
    const upload = await this.prisma.upload.findUnique({
      where: { id: uploadId },
      include: { chunks: { orderBy: { chunkIndex: 'asc' } } },
    });

    if (!upload) {
      throw new NotFoundException('Upload record not found');
    }

    if (upload.userId !== userId) {
      throw new BadRequestException('Not authorized');
    }

    const uploadedChunks = upload.chunks.filter((c) => c.uploaded).map((c) => c.chunkIndex);
    const progress = Number((BigInt(upload.uploadedBytes) * BigInt(100)) / BigInt(upload.totalSize));

    return {
      uploadId: upload.id,
      filename: upload.filename,
      mimeType: upload.mimeType,
      totalSize: upload.totalSize.toString(),
      totalChunks: upload.totalChunks,
      uploadedBytes: upload.uploadedBytes.toString(),
      uploadedChunks,
      progress,
      status: upload.status,
      url: upload.url,
    };
  }

  /** 列出用户的所有上传记录 */
  async listUploads(query: QueryUploadDto, userId: string) {
    const uploads = await this.prisma.upload.findMany({
      where: {
        userId,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return uploads.map((u) => ({
      uploadId: u.id,
      filename: u.filename,
      mimeType: u.mimeType,
      totalSize: u.totalSize.toString(),
      totalChunks: u.totalChunks,
      uploadedBytes: u.uploadedBytes.toString(),
      progress: Number((BigInt(u.uploadedBytes) * BigInt(100)) / BigInt(u.totalSize)),
      status: u.status,
      url: u.url,
      createdAt: u.createdAt,
    }));
  }

  /** 合并所有分片，生成最终文件 */
  async completeUpload(uploadId: string, userId: string) {
    const upload = await this.prisma.upload.findUnique({
      where: { id: uploadId },
      include: { chunks: { orderBy: { chunkIndex: 'asc' } } },
    });

    if (!upload) {
      throw new NotFoundException('Upload record not found');
    }

    if (upload.userId !== userId) {
      throw new BadRequestException('Not authorized');
    }

    if (upload.status === 'COMPLETED') {
      return { uploadId, url: upload.url };
    }

    // 验证所有分片都上传完成
    const missingChunks = upload.chunks.filter((c) => !c.uploaded);
    if (missingChunks.length > 0) {
      throw new BadRequestException(
        `Missing chunks: ${missingChunks.map((c) => c.chunkIndex).join(', ')}`,
      );
    }

    await this.ensureBucket();

    // 合并分片：按顺序读取所有分片，然后 putObject 组合成完整文件
    const chunksBuffers: Buffer[] = [];
    for (let i = 0; i < upload.totalChunks; i++) {
      const chunkKey = `${upload.objectKey}/chunks/${i}`;
      const data = await this.minioClient.getObject(this.bucket, chunkKey);
      const chunks: Buffer[] = [];
      for await (const chunk of data) {
        chunks.push(chunk as Buffer);
      }
      chunksBuffers.push(Buffer.concat(chunks));

    // 合并完一个删一个（可选，节省空间）
    try {
      await this.minioClient.removeObject(this.bucket, chunkKey as string);
    } catch {
      // 删除失败不影响流程
    }
    }

    const fullBuffer = Buffer.concat(chunksBuffers);

    // 写入完整文件到 MinIO（v8: stream, size, metaData）
    await this.minioClient.putObject(
      this.bucket,
      upload.objectKey!,
      fullBuffer,
      fullBuffer.length,
      { 'Content-Type': upload.mimeType },
    );

    // 生成代理访问 URL（通过后端流式代理，避免 MinIO 预签名 URL 的主机名绑定问题）
    const apiBase = this.config.get<string>('PUBLIC_API_URL', 'http://localhost:3000/api/v1')!.replace(/\/+$/, '');
    const url = `${apiBase}/uploads/${uploadId}/file`;

    // 更新状态
    await this.prisma.upload.update({
      where: { id: uploadId },
      data: { status: 'COMPLETED', url },
    });

    return { uploadId, url };
  }

  /** 通过 uploadId 代理下载文件（解决 MinIO 预签名 URL 跨主机签名问题） */
  async streamFile(uploadId: string, res: Response): Promise<void> {
    const upload = await this.prisma.upload.findUnique({
      where: { id: uploadId },
    });

    if (!upload || upload.status !== 'COMPLETED' || !upload.objectKey) {
      throw new NotFoundException('File not found');
    }

    const stat = await this.minioClient.statObject(this.bucket, upload.objectKey);
    const stream = await this.minioClient.getObject(this.bucket, upload.objectKey);

    res.set({
      'Content-Type': upload.mimeType,
      'Content-Length': stat.size.toString(),
      'Content-Disposition': `inline; filename="${encodeURIComponent(upload.filename)}"`,
      'Cache-Control': 'public, max-age=86400',
      'ETag': stat.etag,
    });

    stream.pipe(res);
  }

  /** 取消上传，清理 MinIO 中的分片和记录 */
  async cancelUpload(uploadId: string, userId: string) {
    const upload = await this.prisma.upload.findUnique({
      where: { id: uploadId },
      include: { chunks: true },
    });

    if (!upload) {
      throw new NotFoundException('Upload record not found');
    }

    if (upload.userId !== userId) {
      throw new BadRequestException('Not authorized');
    }

    if (upload.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed upload');
    }

    // 删除 MinIO 中的分片
    const chunkKeys = upload.chunks.map((_, i) => `${upload.objectKey}/chunks/${i}`);
    if (chunkKeys.length > 0) {
      await Promise.allSettled(
        chunkKeys.map((key) => this.minioClient.removeObject(this.bucket, key)),
      );
    }

    // 更新状态
    await this.prisma.upload.update({
      where: { id: uploadId },
      data: { status: 'CANCELLED' },
    });

    return { uploadId, message: 'Upload cancelled' };
  }

  /** 计算已上传字节数 */
  private async calculateUploadedBytes(uploadId: string): Promise<number> {
    const chunks = await this.prisma.uploadChunk.findMany({
      where: { uploadId, uploaded: true },
    });
    return chunks.reduce((sum, c) => sum + Number(c.size), 0);
  }
}
