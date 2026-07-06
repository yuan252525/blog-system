import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationsGateway } from '../notifications/notifications.gateway.js';
import type { ChatMessageWithRelations } from './chat.service.js';

interface AuthenticatedSocket extends Socket {
  userId: string;
  username: string;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    credentials: true,
  },
  maxHttpBufferSize: 10 * 1024 * 1024, // 10MB max message size
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  // roomId -> Set<socketId>
  private readonly roomSockets = new Map<string, Set<string>>();
  // socketId -> { userId, username }
  private readonly socketUsers = new Map<string, { userId: string; username: string }>();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  // ==================== 连接管理 ====================

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`No token provided, disconnecting: ${client.id}`);
        client.emit('auth_error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      (client as AuthenticatedSocket).userId = payload.sub;
      (client as AuthenticatedSocket).username = payload.username;

      this.socketUsers.set(client.id, { userId: payload.sub, username: payload.username });
      this.logger.log(`User ${payload.username} (${payload.sub}) connected: ${client.id}`);

      client.emit('connected', { userId: payload.sub, username: payload.username });
    } catch (err) {
      this.logger.warn(`Auth failed for ${client.id}: ${err}`);
      client.emit('auth_error', { message: 'Invalid or expired token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const user = this.socketUsers.get(client.id);
    if (user) {
      // 通知所有已加入房间的用户下线
      this.roomSockets.forEach((sockets, roomId) => {
        if (sockets.has(client.id)) {
          sockets.delete(client.id);
          this.server.to(roomId).emit('user_offline', {
            userId: user.userId,
            username: user.username,
          });
        }
      });

      this.socketUsers.delete(client.id);
      this.logger.log(`User ${user.username} disconnected: ${client.id}`);
    }
  }

  // ==================== 房间事件 ====================

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const userId = this.getUserId(client, 'join_room');
    const username = this.socketUsers.get(client.id)?.username ?? 'Unknown';

    try {
      // 验证用户是房间成员
      await this.chatService.getRoom(data.roomId);

      client.join(data.roomId);

      // 记录
      if (!this.roomSockets.has(data.roomId)) {
        this.roomSockets.set(data.roomId, new Set());
      }
      this.roomSockets.get(data.roomId)!.add(client.id);

      // 广播用户加入
      client.to(data.roomId).emit('user_joined', {
        userId,
        username,
        roomId: data.roomId,
      });

      // 发送当前在线用户列表
      const onlineUsers = this.getOnlineUsers(data.roomId);
      client.emit('online_users', { roomId: data.roomId, users: onlineUsers });

      // 发送加入确认（包含消息历史）
      const history = await this.chatService.getMessages(data.roomId, userId);
      client.emit('joined_room', {
        roomId: data.roomId,
        messages: history.data,
        meta: history.meta,
      });

      this.logger.log(`${username} joined room ${data.roomId}`);
    } catch (err) {
      client.emit('error', { event: 'join_room', message: (err as Error).message });
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const userId = this.getUserId(client, 'leave_room');
    const username = this.socketUsers.get(client.id)?.username ?? 'Unknown';

    client.leave(data.roomId);

    const sockets = this.roomSockets.get(data.roomId);
    if (sockets) {
      sockets.delete(client.id);
    }

    client.to(data.roomId).emit('user_left', {
      userId,
      username,
      roomId: data.roomId,
    });

    this.logger.log(`${username} left room ${data.roomId}`);
  }

  // ==================== 消息事件 ====================

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      roomId: string;
      content: string;
      type?: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      mentions?: string[];
    },
  ): Promise<void> {
    const userId = this.getUserId(client, 'send_message');

    try {
      const message = await this.chatService.sendMessage(userId, {
        roomId: data.roomId,
        content: data.content,
        type: data.type,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        mentions: data.mentions,
      });

      // 广播消息给房间内所有用户（包括发送者）
      this.server.to(data.roomId).emit('new_message', message);

      // 对 @ 提及的用户发送通知
      if (message.mentions && message.mentions.length > 0) {
        const senderUsername = this.socketUsers.get(client.id)?.username ?? 'Unknown';
        const truncatedContent = message.content.length > 50
          ? message.content.slice(0, 50) + '...'
          : message.content;

        for (const mention of message.mentions) {
          const mentionedUserId = mention.user.id;

          // 通过通知系统创建通知（带防刷去重）
          const notification = await this.notificationsService.create({
            type: 'CHAT_MENTION',
            userId: mentionedUserId,
            actorId: userId,
            message: `${senderUsername} 在聊天中 @了你: "${truncatedContent}"`,
            commentId: data.roomId, // 用 commentId 存 roomId，点击时跳转
          });

          if (notification) {
            // 推送实时通知
            this.notificationsGateway.sendNotificationToUser(mentionedUserId, notification);
            // 更新未读数
            const { count } = await this.notificationsService.getUnreadCount(mentionedUserId);
            this.notificationsGateway.sendUnreadCountToUser(mentionedUserId, count);
          }
        }
      }
    } catch (err) {
      client.emit('error', { event: 'send_message', message: (err as Error).message });
    }
  }

  @SubscribeMessage('load_messages')
  async handleLoadMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; page?: number; limit?: number },
  ): Promise<void> {
    const userId = this.getUserId(client, 'load_messages');

    try {
      const result = await this.chatService.getMessages(
        data.roomId,
        userId,
        data.page ?? 1,
        data.limit ?? 50,
      );

      client.emit('message_history', {
        roomId: data.roomId,
        messages: result.data,
        meta: result.meta,
      });
    } catch (err) {
      client.emit('error', { event: 'load_messages', message: (err as Error).message });
    }
  }

  // ==================== 输入状态 ====================

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): void {
    const user = this.socketUsers.get(client.id);
    if (!user) return;

    client.to(data.roomId).emit('typing', {
      userId: user.userId,
      username: user.username,
      roomId: data.roomId,
    });
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): void {
    const user = this.socketUsers.get(client.id);
    if (!user) return;

    client.to(data.roomId).emit('stop_typing', {
      userId: user.userId,
      username: user.username,
      roomId: data.roomId,
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const userId = this.getUserId(client, 'mark_read');
    await this.chatService.markAsRead(userId, data.roomId);
  }

  // ==================== 辅助方法 ====================

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake?.auth?.token;
    if (auth) return typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : auth;

    const query = client.handshake?.query?.token;
    if (query) return typeof query === 'string' ? query : undefined;

    return undefined;
  }

  private getUserId(client: Socket, event: string): string {
    const user = this.socketUsers.get(client.id);
    if (!user) {
      throw new WsException('Not authenticated');
    }
    return user.userId;
  }

  private getOnlineUsers(roomId: string): { userId: string; username: string }[] {
    const sockets = this.roomSockets.get(roomId);
    if (!sockets) return [];

    const users: { userId: string; username: string }[] = [];
    const seen = new Set<string>();

    sockets.forEach((sid) => {
      const user = this.socketUsers.get(sid);
      if (user && !seen.has(user.userId)) {
        seen.add(user.userId);
        users.push({ userId: user.userId, username: user.username });
      }
    });

    return users;
  }
}
