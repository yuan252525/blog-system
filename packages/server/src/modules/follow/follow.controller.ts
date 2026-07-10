import { Controller, Post, Delete, Get, Param, Query, Req } from '@nestjs/common';
import { ParseIntPipe } from '@nestjs/common';
import type { Request } from 'express';
import { FollowService } from './follow.service.js';

interface AuthenticatedRequest extends Request {
  user: { id: string; username: string; email: string };
}

@Controller('follow')
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Post(':username')
  follow(@Req() req: AuthenticatedRequest, @Param('username') username: string) {
    return this.followService.follow(req.user.id, username);
  }

  @Delete(':username')
  unfollow(@Req() req: AuthenticatedRequest, @Param('username') username: string) {
    return this.followService.unfollow(req.user.id, username);
  }

  @Get(':username/status')
  status(@Req() req: AuthenticatedRequest, @Param('username') username: string) {
    return this.followService.getStatus(req.user.id, username);
  }

  @Get(':username/followers')
  followers(
    @Param('username') username: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.followService.getFollowers(username, page, limit);
  }

  @Get(':username/following')
  following(
    @Param('username') username: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.followService.getFollowing(username, page, limit);
  }
}
