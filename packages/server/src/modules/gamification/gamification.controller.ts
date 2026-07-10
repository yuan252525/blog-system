import { Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { GamificationService } from './gamification.service.js';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags('gamification')
@Controller('gamification')
export class GamificationController {
  constructor(private gamificationService: GamificationService) {}

  @Post('checkin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '每日签到', description: '同一天重复签到返回 409' })
  @ApiResponse({ status: 201, description: '签到成功' })
  @ApiResponse({ status: 409, description: '今日已签到' })
  checkIn(@Req() req: AuthenticatedRequest) {
    return this.gamificationService.checkIn(req.user.id);
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '获取我的成长状态', description: '含积分、等级、连签、已获得徽章' })
  getMe(@Req() req: AuthenticatedRequest) {
    return this.gamificationService.getMyStatus(req.user.id);
  }

  @Get('badges')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '获取徽章列表及获得情况' })
  getBadges(@Req() req: AuthenticatedRequest) {
    return this.gamificationService.getBadges(req.user.id);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: '积分排行榜', description: '按积分降序返回前 N 名' })
  getLeaderboard(@Query('limit') limit?: string) {
    const n = Math.min(Math.max(parseInt(limit ?? '20', 10) || 20, 1), 100);
    return this.gamificationService.getLeaderboard(n);
  }
}
