import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationsGateway } from '../notifications/notifications.gateway.js';

@Injectable()
export class FollowService {
  private readonly logger = new Logger(FollowService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  /** 关注某人（按 username）；已关注则幂等返回 true */
  async follow(followerId: string, targetUsername: string) {
    const target = await this.prisma.user.findUnique({
      where: { username: targetUsername },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');
    if (target.id === followerId) throw new BadRequestException('Cannot follow yourself');

    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId: target.id } },
      create: { followerId, followingId: target.id },
      update: {},
    });

    // 通知对方：有人关注了你
    try {
      const notif = await this.notificationsService.create({
        type: 'FOLLOW',
        userId: target.id,
        actorId: followerId,
        message: '关注了你',
      });
      if (notif) {
        this.notificationsGateway.sendNotificationToUser(target.id, notif);
        const { count } = await this.notificationsService.getUnreadCount(target.id);
        this.notificationsGateway.sendUnreadCountToUser(target.id, count);
      }
    } catch (err) {
      this.logger.error('Failed to send follow notification', err);
    }

    return { following: true };
  }

  async unfollow(followerId: string, targetUsername: string) {
    const target = await this.prisma.user.findUnique({
      where: { username: targetUsername },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');
    await this.prisma.follow.deleteMany({
      where: { followerId, followingId: target.id },
    });
    return { following: false };
  }

  async getStatus(followerId: string | null, targetUsername: string) {
    const target = await this.prisma.user.findUnique({
      where: { username: targetUsername },
      select: { id: true, _count: { select: { followers: true, following: true } } },
    });
    if (!target) throw new NotFoundException('User not found');
    const isFollowing = followerId
      ? (await this.prisma.follow.count({
          where: { followerId, followingId: target.id },
        })) > 0
      : false;
    return {
      isFollowing,
      followerCount: target._count.followers,
      followingCount: target._count.following,
    };
  }

  async getFollowers(username: string, page = 1, limit = 20) {
    const target = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!target) throw new NotFoundException('User not found');
    return this.paginateUsers({ followingId: target.id }, page, limit, 'followers');
  }

  async getFollowing(username: string, page = 1, limit = 20) {
    const target = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!target) throw new NotFoundException('User not found');
    return this.paginateUsers({ followerId: target.id }, page, limit, 'following');
  }

  private async paginateUsers(
    where: { followerId?: string; followingId?: string },
    page: number,
    limit: number,
    relation: 'followers' | 'following',
  ) {
    const skip = (page - 1) * limit;
    const follows = await this.prisma.follow.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        follower: { select: { id: true, username: true, avatar: true, bio: true } },
        following: { select: { id: true, username: true, avatar: true, bio: true } },
      },
    });
    const total = await this.prisma.follow.count({ where });
    const data = follows.map((f) => (relation === 'followers' ? f.follower : f.following));
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** 获取某用户的粉丝 ID 列表（用于新内容通知广播） */
  async getFollowerIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });
    return rows.map((r) => r.followerId);
  }

  /** 给作者粉丝广播新内容通知（文章 / 动态） */
  async notifyNewContent(
    authorId: string,
    opts: { type: 'NEW_POST' | 'NEW_MOMENT'; postId?: string; momentId?: string; message: string },
  ) {
    const followerIds = await this.getFollowerIds(authorId);
    if (followerIds.length === 0) return;
    for (const fid of followerIds) {
      try {
        const notif = await this.notificationsService.create({
          type: opts.type,
          userId: fid,
          actorId: authorId,
          postId: opts.postId,
          momentId: opts.momentId,
          message: opts.message,
        });
        if (notif) {
          this.notificationsGateway.sendNotificationToUser(fid, notif);
          const { count } = await this.notificationsService.getUnreadCount(fid);
          this.notificationsGateway.sendUnreadCountToUser(fid, count);
        }
      } catch (err) {
        this.logger.error('Failed to notify follower', err);
      }
    }
  }
}
