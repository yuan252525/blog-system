import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { ChatService } from './chat.service.js';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** 获取所有聊天室 */
  @Get('rooms')
  async getRooms(@Req() req: Request) {
    return this.chatService.getUserRooms((req.user as any).id);
  }

  /** 获取可发现的群聊（未加入的） */
  @Get('rooms/discover')
  async getDiscoverableRooms(@Req() req: Request) {
    return this.chatService.getDiscoverableRooms((req.user as any).id);
  }

  /** 创建群聊室 */
  @Post('rooms')
  async createRoom(
    @Req() req: Request,
    @Body() body: { name: string; description?: string },
  ) {
    return this.chatService.createRoom((req.user as any).id, body);
  }

  /** 获取房间详情 */
  @Get('rooms/:id')
  async getRoom(@Param('id') id: string) {
    return this.chatService.getRoom(id);
  }

  /** 创建/获取私聊房间 */
  @Post('rooms/direct/:userId')
  async createDirectRoom(
    @Req() req: Request,
    @Param('userId') targetUserId: string,
  ) {
    return this.chatService.getOrCreateDirectRoom((req.user as any).id, targetUserId);
  }

  /** 加入群聊 */
  @Post('rooms/:id/join')
  async joinRoom(@Req() req: Request, @Param('id') id: string) {
    return this.chatService.joinRoom((req.user as any).id, id);
  }

  /** 离开群聊 */
  @Delete('rooms/:id/leave')
  async leaveRoom(@Req() req: Request, @Param('id') id: string) {
    return this.chatService.leaveRoom((req.user as any).id, id);
  }

  /** 邀请用户加入群聊 */
  @Post('rooms/:id/invite')
  async inviteUsers(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { userIds: string[] },
  ) {
    return this.chatService.inviteUsers(id, (req.user as any).id, body.userIds);
  }

  /** 获取房间成员 */
  @Get('rooms/:id/members')
  async getMembers(@Param('id') id: string) {
    return this.chatService.getRoomMembers(id);
  }

  /** 获取消息历史 */
  @Get('rooms/:id/messages')
  async getMessages(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(
      id,
      (req.user as any).id,
      Number(page) || 1,
      Number(limit) || 50,
    );
  }

  /** 搜索用户 */
  @Get('users/search')
  async searchUsers(@Req() req: Request, @Query('q') query: string) {
    return this.chatService.searchUsers(query || '', (req.user as any).id);
  }

  /** 获取未读消息数 */
  @Get('rooms/:id/unread')
  async getUnreadCount(@Req() req: Request, @Param('id') id: string) {
    return {
      count: await this.chatService.getUnreadCount((req.user as any).id, id),
    };
  }

  /** 获取所有房间的总未读数 */
  @Get('unread')
  async getTotalUnread(@Req() req: Request) {
    const userId = (req.user as any).id;
    const rooms = await this.chatService.getUserRooms(userId);

    let total = 0;
    for (const room of rooms) {
      total += await this.chatService.getUnreadCount(userId, room.id);
    }

    return { total };
  }
}
