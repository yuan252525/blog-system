import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { UseGuards, Logger, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtAuthGuard } from '../../common/guards/ws-jwt-auth.guard.js';
import { NotificationsService } from './notifications.service.js';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  // userId -> Set<socketId>
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  /** 向指定用户推送通知 */
  sendNotificationToUser(userId: string, notification: any) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds && socketIds.size > 0) {
      socketIds.forEach((sid) => {
        this.server.to(sid).emit('new_notification', notification);
      });
      this.logger.log(`Notification pushed to user ${userId}`);
    }
  }

  /** 向指定用户推送未读数更新 */
  sendUnreadCountToUser(userId: string, count: number) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds && socketIds.size > 0) {
      socketIds.forEach((sid) => {
        this.server.to(sid).emit('unread_count', { count });
      });
    }
  }

  async handleConnection(client: Socket) {
    try {
      // 手动验证 token（因为 handleConnection 不支持 Guard 装饰器）
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const jwt = token.startsWith('Bearer ') ? token.slice(7) : token;
      // JWT 验证延迟到 connection 之后用 subscribe 消息
      // 这里先接受连接，认证通过 auth 消息
      this.logger.log(`Client connected: ${client.id}`);
    } catch (err) {
      this.logger.error('Connection error', err);
      client.disconnect();
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('auth')
  async handleAuth(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { token: string },
  ): Promise<void> {
    // 认证通过后由 Guard 填充 client.data.user
    // 这里做简化处理：直接用传入的 userId
    const userId = client.data?.user?.id || data.token; // fallback
    client.data.userId = client.data?.user?.id;

    if (client.data.userId) {
      if (!this.userSockets.has(client.data.userId)) {
        this.userSockets.set(client.data.userId, new Set());
      }
      this.userSockets.get(client.data.userId)!.add(client.id);
      this.logger.log(`User ${client.data.userId} authenticated on socket ${client.id}`);

      // 推送当前未读数
      try {
        const { count } = await this.notificationsService.getUnreadCount(client.data.userId);
        client.emit('unread_count', { count });
      } catch {
        // silent
      }
    }

    client.emit('auth_ok', { success: true });
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId)!;
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }
}
