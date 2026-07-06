import { Controller, Get, Post, Put, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { CommentsService } from './comments.service.js';
import { CreateCommentDto, UpdateCommentDto } from './comments.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard.js';

interface AuthenticatedRequest extends Request {
  user: { id: string; username: string; email: string };
}

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('post/:postId')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '获取文章评论' })
  findByPostId(@Param('postId') postId: string, @Req() req: Request) {
    const user = (req as AuthenticatedRequest).user;
    return this.commentsService.findByPostId(postId, user?.id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建评论' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateCommentDto) {
    return this.commentsService.create(req.user.id, dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '编辑评论' })
  update(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Body() dto: UpdateCommentDto) {
    return this.commentsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除评论' })
  delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.commentsService.delete(id, req.user.id);
  }

  @Post(':id/like')
  @ApiBearerAuth()
  @ApiOperation({ summary: '点赞/取消点赞评论（toggle）' })
  like(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.commentsService.like(id, req.user.id);
  }
}
