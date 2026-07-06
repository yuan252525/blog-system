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

      // JWT 验证延迟到 connection 之后用 auth 消息 + WsJwtAuthGuard 完成
      // 这里先接受连接
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
    @MessageBody() _data: { token: string },
  ): Promise<void> {
    // 认证通过后由 WsJwtAuthGuard 填充 client.data.user = jwtPayload
    // jwtPayload 结构: { sub: userId, username: string, iat, exp }
    const userId = client.data?.user?.sub;
    client.data.userId = userId;

    if (userId) {
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      this.logger.log(`User ${userId} authenticated on socket ${client.id}`);

      // 推送当前未读数
      try {
        const { count } = await this.notificationsService.getUnreadCount(userId);
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
