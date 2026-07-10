import { Injectable, ConflictException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationsGateway } from '../notifications/notifications.gateway.js';
import { computeLevel, POINTS_PER_LEVEL } from './level.util.js';
import { BADGES } from './badges.js';
import { GAMIFICATION_POINTS } from './gamification.constants.js';

export interface BadgeInfo {
  key: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
}

export interface GamificationStatus {
  points: number;
  level: number;
  exp: number;
  expToNext: number;
  streak: number;
  lastCheckIn: Date | null;
  checkedInToday: boolean;
  badges: BadgeInfo[];
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isYesterday(prev: Date | null, today: Date): boolean {
  if (!prev) return false;
  const y = startOfDay(today);
  y.setDate(y.getDate() - 1);
  return startOfDay(prev).getTime() === y.getTime();
}

@Injectable()
export class GamificationService implements OnModuleInit {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  /** 模块初始化时确保徽章种子数据存在 */
  async onModuleInit() {
    await this.seedBadges();
  }

  private async seedBadges() {
    for (const b of BADGES) {
      await this.prisma.badge.upsert({
        where: { key: b.key },
        update: {},
        create: { key: b.key, name: b.name, description: b.description, icon: b.icon },
      });
    }
  }

  /** 奖励积分并刷新等级，随后校验徽章 */
  async awardPoints(userId: string, amount: number): Promise<void> {
    if (amount <= 0) return;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { points: { increment: amount } },
      select: { points: true },
    });
    const { level } = computeLevel(user.points);
    await this.prisma.user.update({ where: { id: userId }, data: { level } });
    await this.evaluateBadges(userId);
  }

  /** 每日签到：返回本次获得的积分与连签天数，已签到则抛冲突 */
  async checkIn(userId: string) {
    const today = startOfDay(new Date());
    const already = await this.prisma.checkIn.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    if (already) {
      throw new ConflictException('今日已签到');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastCheckIn: true, checkInStreak: true, points: true },
    });

    const streak = isYesterday(user?.lastCheckIn ?? null, today)
      ? (user?.checkInStreak ?? 0) + 1
      : 1;
    // 连签奖励：每天额外 +1，最多 +7
    const bonus = Math.min(streak, 7);
    const gained = GAMIFICATION_POINTS.CHECKIN_BASE + bonus;
    const newPoints = (user?.points ?? 0) + gained;
    const { level } = computeLevel(newPoints);

    await this.prisma.$transaction([
      this.prisma.checkIn.create({ data: { userId, date: today } }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          lastCheckIn: new Date(),
          checkInStreak: streak,
          points: newPoints,
          level,
        },
      }),
    ]);

    await this.evaluateBadges(userId);

    return {
      streak,
      gained,
      points: newPoints,
      level,
      checkedInToday: true,
    };
  }

  /** 获取当前用户成长状态（含已获得徽章） */
  async getMyStatus(userId: string): Promise<GamificationStatus> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { points: true, level: true, lastCheckIn: true, checkInStreak: true },
    });

    const today = startOfDay(new Date());
    const checkedInToday = user?.lastCheckIn
      ? startOfDay(user.lastCheckIn).getTime() === today.getTime()
      : false;

    const { exp, expToNext } = computeLevel(user?.points ?? 0);
    const badges = await this.getBadges(userId);

    return {
      points: user?.points ?? 0,
      level: user?.level ?? 1,
      exp,
      expToNext,
      streak: user?.checkInStreak ?? 0,
      lastCheckIn: user?.lastCheckIn ?? null,
      checkedInToday,
      badges,
    };
  }

  /** 获取全部徽章及当前用户获得情况 */
  async getBadges(userId: string): Promise<BadgeInfo[]> {
    const earnedRows = await this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
    });
    const earnedMap = new Map(earnedRows.map((e) => [e.badge.key, e.earnedAt]));

    return BADGES.map((b) => ({
      key: b.key,
      name: b.name,
      description: b.description,
      icon: b.icon,
      earned: earnedMap.has(b.key),
      earnedAt: earnedMap.get(b.key) ? earnedMap.get(b.key)!.toISOString() : null,
    }));
  }

  /** 排行榜：按积分、等级排序 */
  async getLeaderboard(limit = 20) {
    const users = await this.prisma.user.findMany({
      orderBy: [{ points: 'desc' }, { level: 'desc' }],
      take: limit,
      select: { id: true, username: true, avatar: true, level: true, points: true },
    });
    return users;
  }

  /**
   * 校验并发放徽章：根据文章数、评论数、连签天数、积分自动判定。
   * 该方法幂等，重复调用只会发放新达成的徽章。
   */
  async evaluateBadges(userId: string): Promise<void> {
    const [user, postCount, commentCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { points: true, checkInStreak: true },
      }),
      this.prisma.post.count({ where: { authorId: userId, status: 'PUBLISHED' } }),
      this.prisma.comment.count({ where: { userId } }),
    ]);

    const conditions: Record<string, boolean> = {
      first_post: postCount >= 1,
      first_comment: commentCount >= 1,
      checkin_7: (user?.checkInStreak ?? 0) >= 7,
      checkin_30: (user?.checkInStreak ?? 0) >= 30,
      points_500: (user?.points ?? 0) >= 500,
      points_2000: (user?.points ?? 0) >= 2000,
    };

    const earnedRows = await this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
    });
    const earnedKeys = new Set(earnedRows.map((e) => e.badge.key));

    const toAward = BADGES.filter((b) => conditions[b.key] && !earnedKeys.has(b.key));

    for (const b of toAward) {
      const badge = await this.prisma.badge.findUnique({ where: { key: b.key } });
      if (!badge) continue;

      await this.prisma.userBadge.create({ data: { userId, badgeId: badge.id } });

      // 系统徽章通知（允许自己发给自己）
      try {
        const notif = await this.prisma.notification.create({
          data: {
            type: 'BADGE_EARNED',
            message: `恭喜获得徽章「${b.name}」`,
            userId,
            actorId: userId,
          },
          include: {
            actor: { select: { id: true, username: true, avatar: true } },
            post: { select: { id: true, slug: true } },
          },
        });
        this.notificationsGateway.sendNotificationToUser(userId, notif);
        const { count } = await this.notificationsService.getUnreadCount(userId);
        this.notificationsGateway.sendUnreadCountToUser(userId, count);
      } catch (err) {
        this.logger.error('Failed to send badge notification', err);
      }
    }
  }

  /** 供其它模块（发帖/评论）调用，确保异常不影响主流程 */
  async safeAwardPoints(userId: string, amount: number): Promise<void> {
    try {
      await this.awardPoints(userId, amount);
    } catch (err) {
      this.logger.warn(`Failed to award points to ${userId}`, err);
    }
  }
}

// 供其它模块复用
export { POINTS_PER_LEVEL };
