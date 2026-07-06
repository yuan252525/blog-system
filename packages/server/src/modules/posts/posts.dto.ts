import { IsString, IsOptional, IsEnum, IsArray, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostStatus } from '../../../generated/prisma/client.js';

export class CreatePostDto {
  @ApiProperty({ description: '文章标题', example: '我的第一篇博客', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: '文章内容（Markdown 格式）', example: '# 你好世界\n\n这是我的第一篇博客文章。' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ description: '文章摘要', example: '这是一篇介绍性的文章', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiPropertyOptional({ description: '封面图片 URL', example: 'https://example.com/cover.jpg' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ description: '文章状态', enum: PostStatus, example: 'DRAFT' })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({ description: '标签列表', example: ['javascript', '前端'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '分类 ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class UpdatePostDto {
  @ApiPropertyOptional({ description: '文章标题', example: '更新后的标题', minLength: 1, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: '文章内容（Markdown 格式）', example: '# 更新后的内容' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @ApiPropertyOptional({ description: '文章摘要', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiPropertyOptional({ description: '封面图片 URL' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ description: '文章状态', enum: PostStatus })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({ description: '标签列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '分类 ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class QueryPostsDto {
  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ description: '文章状态筛选', enum: PostStatus })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({ description: '搜索关键词', example: '博客' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '按标签筛选（标签 slug）', example: 'javascript' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: '按分类筛选（分类 slug）' })
  @IsOptional()
  @IsString()
  category?: string;
}
