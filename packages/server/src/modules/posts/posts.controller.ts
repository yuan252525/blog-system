import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { PostsService } from './posts.service.js';
import { CreatePostDto, UpdatePostDto, QueryPostsDto } from './posts.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';

interface AuthenticatedRequest extends Request {
  user: { id: string; username: string; email: string };
}

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '获取文章列表', description: '分页查询文章，支持搜索、按状态/标签筛选' })
  @ApiResponse({ status: 200, description: '返回分页文章列表' })
  findAll(@Req() req: Request) {
    const query = req.query as Record<string, any>;
    const authorId = typeof query.authorId === 'string' ? query.authorId : undefined;
    const effectiveQuery = { ...query };
    const uid = (req as AuthenticatedRequest).user?.id;
    // 查看他人文章时仅返回公开文章，避免泄露草稿
    if (authorId && uid && uid !== authorId) {
      effectiveQuery.status = 'PUBLISHED';
    }
    return this.postsService.findAll(effectiveQuery as QueryPostsDto, authorId);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: '根据 Slug 获取文章详情', description: '通过唯一 Slug 获取文章完整内容，同时增加阅读计数（IP 去重：5分钟内不重复计数）' })
  @ApiResponse({ status: 200, description: '返回文章详情' })
  @ApiResponse({ status: 404, description: '文章未找到' })
  findBySlug(@Param('slug') slug: string, @Req() req: Request) {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    return this.postsService.findBySlug(slug, clientIp);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '创建文章', description: '创建新文章（需要登录）' })
  @ApiResponse({ status: 201, description: '文章创建成功' })
  @ApiResponse({ status: 401, description: '未登录' })
  create(@Body() dto: CreatePostDto, @Req() req: AuthenticatedRequest) {
    return this.postsService.create(dto, req.user.id);
  }

  @Put(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '更新文章', description: '根据 ID 更新文章（需要是文章作者）' })
  @ApiResponse({ status: 200, description: '文章更新成功' })
  @ApiResponse({ status: 401, description: '未登录' })
  @ApiResponse({ status: 403, description: '无权修改他人文章' })
  @ApiResponse({ status: 404, description: '文章未找到' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.postsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '删除文章', description: '根据 ID 删除文章（需要是文章作者）' })
  @ApiResponse({ status: 200, description: '文章删除成功' })
  @ApiResponse({ status: 401, description: '未登录' })
  @ApiResponse({ status: 403, description: '无权删除他人文章' })
  @ApiResponse({ status: 404, description: '文章未找到' })
  delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.postsService.delete(id, req.user.id);
  }

  @Public()
  @Get('related/:id')
  @ApiOperation({ summary: '获取相关文章' })
  getRelatedPosts(@Param('id') id: string) {
    return this.postsService.getRelatedPosts(id);
  }
}
