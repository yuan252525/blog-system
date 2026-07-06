import { Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationsGateway } from '../notifications/notifications.gateway.js';

@Injectable()
export class LikesService {
  private readonly logger = new Logger(LikesService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => NotificationsGateway))
    private notificationsGateway: NotificationsGateway,
  ) {}

  async toggle(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, title: true, slug: true, authorId: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
      return { liked: false };
    }

    const like = await this.prisma.like.create({ data: { postId, userId } });

    // ====== 通知逻辑：文章被赞 ======
    if (post.authorId !== userId) {
      try {
        const actor = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });
        const notif = await this.notificationsService.create({
          type: 'POST_LIKE',
          userId: post.authorId,
          actorId: userId,
          postId: postId,
          message: `${actor?.username || '有人'} 赞了你的文章《${post.title}》`,
        });
        if (notif) {
          this.notificationsGateway.sendNotificationToUser(post.authorId, notif);
          const { count } = await this.notificationsService.getUnreadCount(post.authorId);
          this.notificationsGateway.sendUnreadCountToUser(post.authorId, count);
        }
      } catch (err) {
        this.logger.error('Failed to create post like notification', err);
      }
    }

    return { liked: true };
  }

  async getLikeStatus(postId: string, userId?: string) {
    const count = await this.prisma.like.count({ where: { postId } });

    if (!userId) return { liked: false, count };

    const existing = await this.prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    return { liked: !!existing, count };
  }

  async getUserLikes(userId: string) {
    return this.prisma.like.findMany({
      where: { userId },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            coverImage: true,
            publishedAt: true,
            author: { select: { username: true, avatar: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
