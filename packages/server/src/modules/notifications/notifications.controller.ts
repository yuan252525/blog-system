import { Controller, Get, Put, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { NotificationsService } from './notifications.service.js';
import { QueryNotificationsDto } from './notifications.dto.js';

interface AuthenticatedRequest extends Request {
  user: { id: string; username: string; email: string };
}

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: '获取通知列表' })
  findAll(@Req() req: AuthenticatedRequest, @Query() query: QueryNotificationsDto) {
    return this.notificationsService.findByUser(req.user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读通知数' })
  unreadCount(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Put('read-all')
  @ApiOperation({ summary: '全部标记为已读' })
  markAllAsRead(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Put(':id/read')
  @ApiOperation({ summary: '标记单条通知为已读' })
  markAsRead(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }
}
