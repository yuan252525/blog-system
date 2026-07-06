import { Controller, Post, Get, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { LikesService } from './likes.service.js';
import { Public } from '../../common/decorators/public.decorator.js';

interface AuthenticatedRequest extends Request {
  user?: { id: string; username: string; email: string };
}

@ApiTags('likes')
@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post('post/:postId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '点赞/取消点赞' })
  toggle(@Param('postId') postId: string, @Req() req: AuthenticatedRequest) {
    return this.likesService.toggle(postId, req.user!.id);
  }

  @Get('post/:postId')
  @Public()
  @ApiOperation({ summary: '获取点赞状态和数量' })
  getStatus(@Param('postId') postId: string, @Req() req: AuthenticatedRequest) {
    return this.likesService.getLikeStatus(postId, req.user?.id);
  }

  @Get('user')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户点赞的文章' })
  getUserLikes(@Req() req: AuthenticatedRequest) {
    return this.likesService.getUserLikes(req.user!.id);
  }
}
