import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { RedisClient } from '../../redis/redis.module.js';
import type { QueryNotificationsDto } from './notifications.dto.js';

export type NotificationType =
  | 'COMMENT_REPLY'
  | 'POST_LIKE'
  | 'COMMENT_LIKE'
  | 'CHAT_MENTION'
  | 'MOMENT_LIKE'
  | 'MOMENT_COMMENT';

export interface CreateNotificationInput {
  type: NotificationType;
  userId: string; // 接收者
  actorId: string; // 触发者
  postId?: string;
  commentId?: string;
  momentId?: string;
  message: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redis: RedisClient,
  ) {}

  /** 创建通知，带防刷机制 */
  async create(input: CreateNotificationInput) {
    // 不给自己发通知
    if (input.userId === input.actorId) {
      return null;
    }

    // 防刷机制 1: 同一用户每 10 秒最多创建 5 条通知（滑动窗口限流）
    const rateLimitKey = `notif:rate:${input.actorId}`;
    try {
      const now = Date.now();
      const windowStart = now - 10_000; // 10 秒窗口

      // 清理过期记录并添加当前时间戳
      await this.redis.zremrangebyscore(rateLimitKey, 0, windowStart);
      const count = await this.redis.zcard(rateLimitKey);

      if (count >= 5) {
        this.logger.warn(`Rate limit exceeded for actor ${input.actorId}`);
        return null;
      }

      await this.redis.zadd(rateLimitKey, now, `${now}-${input.type}`);
      await this.redis.expire(rateLimitKey, 30); // 30 秒后自动清理整个 key
    } catch (err) {
      this.logger.error('Redis rate limit check failed', err);
    }

    // 防刷机制 2: 去重 — 同一触发者对同一目标同类型操作，5 分钟内不重复通知
    const dedupKey = `notif:dedup:${input.userId}:${input.actorId}:${input.type}:${input.postId || ''}:${input.commentId || ''}`;
    try {
      const exists = await this.redis.get(dedupKey);
      if (exists) {
        return null; // 重复通知，跳过
      }
      await this.redis.set(dedupKey, '1', 'EX', 300); // 5 分钟去重
    } catch (err) {
      this.logger.error('Redis dedup check failed', err);
    }

    return this.prisma.notification.create({
      data: {
        type: input.type,
        message: input.message,
        userId: input.userId,
        actorId: input.actorId,
        postId: input.postId || null,
        commentId: input.commentId || null,
        momentId: input.momentId || null,
      },
      include: {
        actor: {
          select: { id: true, username: true, avatar: true },
        },
        post: {
          select: { id: true, slug: true },
        },
      },
    });
  }

  async findByUser(userId: string, query: QueryNotificationsDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };
    if (query.unreadOnly) {
      where.isRead = false;
    }

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, username: true, avatar: true },
          },
          post: {
            select: { id: true, slug: true },
          },
        },
      }),
      this.prisma.notification.count({ where: where as any }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      data,
      unreadCount,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notif = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notif || notif.userId !== userId) {
      return null;
    }
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async getUnreadCount(userId: string) {
    return {
      count: await this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    };
  }
}
