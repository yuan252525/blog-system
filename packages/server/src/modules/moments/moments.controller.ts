import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import type { Request, Express } from 'express';
import { MomentsService } from './moments.service.js';
import { CreateMomentDto, CommentMomentDto, QueryMomentsDto } from './moments.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';

interface AuthenticatedRequest extends Request {
  user: { id: string; username: string; email: string };
}

@ApiTags('moments')
@Controller('moments')
export class MomentsController {
  constructor(private momentsService: MomentsService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '发布朋友圈', description: '发布一条朋友圈动态（内容 + 可选图片 URL 列表）' })
  @ApiResponse({ status: 201, description: '发布成功' })
  @ApiResponse({ status: 401, description: '未登录' })
  create(@Body() dto: CreateMomentDto, @Req() req: AuthenticatedRequest) {
    return this.momentsService.create(dto, req.user.id);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '获取朋友圈列表', description: '分页获取朋友圈动态，含作者、点赞、评论与当前用户点赞状态' })
  @ApiResponse({ status: 200, description: '返回分页朋友圈列表' })
  findAll(@Query() query: QueryMomentsDto, @Req() req: AuthenticatedRequest) {
    return this.momentsService.findAll(query, req.user.id);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '获取单条朋友圈详情' })
  @ApiResponse({ status: 200, description: '返回朋友圈详情' })
  @ApiResponse({ status: 404, description: '朋友圈不存在' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.momentsService.findOne(id, req.user.id);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '删除朋友圈', description: '只能删除自己发布的朋友圈' })
  @ApiResponse({ status: 200, description: '删除成功' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.momentsService.remove(id, req.user.id);
  }

  @Post(':id/like')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '点赞朋友圈', description: '对朋友圈点赞（重复点赞幂等）' })
  @ApiResponse({ status: 201, description: '点赞成功' })
  like(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.momentsService.like(id, req.user.id);
  }

  @Delete(':id/like')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '取消点赞朋友圈' })
  @ApiResponse({ status: 200, description: '取消点赞成功' })
  unlike(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.momentsService.unlike(id, req.user.id);
  }

  @Post(':id/comments')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '评论朋友圈', description: '发表评论，可指定 parentId 与 replyToUserId 进行回复' })
  @ApiResponse({ status: 201, description: '评论成功' })
  comment(
    @Param('id') id: string,
    @Body() dto: CommentMomentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.momentsService.comment(id, dto, req.user.id);
  }

  @Delete('comments/:commentId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '删除评论', description: '评论作者或朋友圈作者可删除' })
  @ApiResponse({ status: 200, description: '删除成功' })
  deleteComment(@Param('commentId') commentId: string, @Req() req: AuthenticatedRequest) {
    return this.momentsService.deleteComment(commentId, req.user.id);
  }
}
