import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UploadStatus } from '../../../generated/prisma/client.js';

export class InitUploadDto {
  @ApiProperty({ description: '文件名', example: 'cover.jpg' })
  @IsString()
  filename!: string;

  @ApiProperty({ description: '文件 MIME 类型', example: 'image/jpeg' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ description: '文件总大小（字节）', example: 5242880 })
  @IsNumber()
  totalSize!: number;

  @ApiProperty({ description: '总分片数', example: 5 })
  @IsNumber()
  totalChunks!: number;
}

export class UploadChunkDto {
  @ApiProperty({ description: '分片索引（从 0 开始）', example: 0 })
  @Type(() => Number)
  @IsNumber()
  chunkIndex!: number;

  @ApiProperty({ description: '分片大小（字节）', example: 1048576 })
  @Type(() => Number)
  @IsNumber()
  size!: number;

  @ApiProperty({ description: '分片内容 SHA-256 哈希（Base64）', example: 'abc123...' })
  @IsString()
  hash!: string;
}

export class QueryUploadDto {
  @ApiPropertyOptional({ description: '上传状态筛选' })
  @IsOptional()
  @IsEnum(['PENDING', 'UPLOADING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const)
  status?: 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
}
