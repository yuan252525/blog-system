import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { FollowService } from '../follow/follow.service.js';
import type { CreateMomentDto, CommentMomentDto, QueryMomentsDto } from './moments.dto.js';

@Injectable()
export class MomentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private followService: FollowService,
  ) {}

  private getMomentInclude() {
    return {
      author: { select: { id: true, username: true, avatar: true } },
      likes: {
        select: {
          id: true,
          userId: true,
          user: { select: { id: true, username: true, avatar: true } },
        },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          replyToUser: { select: { id: true, username: true, avatar: true } },
        },
      },
      _count: { select: { likes: true, comments: true } },
    } as const;
  }

  async create(dto: CreateMomentDto, authorId: string) {
    const moment = await this.prisma.moment.create({
      data: {
        content: dto.content,
        images: dto.images ?? [],
        authorId,
      },
      include: this.getMomentInclude(),
    });

    // 通知作者的粉丝：发布了新动态（异常不影响发布主流程）
    await this.followService.notifyNewContent(authorId, {
      type: 'NEW_MOMENT',
      momentId: moment.id,
      message: '发布了新动态',
    });

    return { ...moment, likedByMe: false };
  }

  async findAll(query: QueryMomentsDto, currentUserId: string) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const [moments, total] = await Promise.all([
      this.prisma.moment.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.getMomentInclude(),
      }),
      this.prisma.moment.count(),
    ]);

    // 计算当前用户是否对每条朋友圈点过赞
    const momentIds = moments.map((m) => m.id);
    const myLikes = momentIds.length
      ? await this.prisma.momentLike.findMany({
          where: { momentId: { in: momentIds }, userId: currentUserId },
          select: { momentId: true },
        })
      : [];
    const likedSet = new Set(myLikes.map((l) => l.momentId));

    const data = moments.map((m) => ({ ...m, likedByMe: likedSet.has(m.id) }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 检查自某个时间之后是否有新朋友圈（用于红点提示）
  async hasNew(since?: string) {
    const sinceDate = since ? new Date(since) : new Date(0);
    if (Number.isNaN(sinceDate.getTime())) return { hasNew: false };
    const count = await this.prisma.moment.count({
      where: { createdAt: { gt: sinceDate } },
    });
    return { hasNew: count > 0 };
  }

  async findOne(momentId: string, currentUserId: string) {
    const moment = await this.prisma.moment.findUnique({
      where: { id: momentId },
      include: this.getMomentInclude(),
    });

    if (!moment) {
      throw new NotFoundException('Moment not found');
    }

    const like = await this.prisma.momentLike.findUnique({
      where: { momentId_userId: { momentId, userId: currentUserId } },
    });

    return { ...moment, likedByMe: !!like };
  }

  async remove(momentId: string, userId: string) {
    const moment = await this.prisma.moment.findUnique({ where: { id: momentId } });
    if (!moment) {
      throw new NotFoundException('Moment not found');
    }
    if (moment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own moments');
    }

    await this.prisma.moment.delete({ where: { id: momentId } });
    return { message: 'Moment deleted successfully' };
  }

  async like(momentId: string, userId: string) {
    const moment = await this.prisma.moment.findUnique({ where: { id: momentId } });
    if (!moment) {
      throw new NotFoundException('Moment not found');
    }

    await this.prisma.momentLike.upsert({
      where: { momentId_userId: { momentId, userId } },
      create: { momentId, userId },
      update: {},
    });

    // 通知朋友圈作者（不给自己发）
    await this.notificationsService.create({
      type: 'MOMENT_LIKE',
      userId: moment.authorId,
      actorId: userId,
      momentId,
      message: '赞了你的朋友圈',
    });

    return this.findOne(momentId, userId);
  }

  async unlike(momentId: string, userId: string) {
    const moment = await this.prisma.moment.findUnique({ where: { id: momentId } });
    if (!moment) {
      throw new NotFoundException('Moment not found');
    }

    await this.prisma.momentLike.deleteMany({ where: { momentId, userId } });
    return this.findOne(momentId, userId);
  }

  async comment(momentId: string, dto: CommentMomentDto, userId: string) {
    const moment = await this.prisma.moment.findUnique({
      where: { id: momentId },
      include: { author: { select: { id: true } } },
    });
    if (!moment) {
      throw new NotFoundException('Moment not found');
    }

    // 校验父评论确实属于该朋友圈
    if (dto.parentId) {
      const parent = await this.prisma.momentComment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.momentId !== momentId) {
        throw new BadRequestException('Parent comment not found');
      }
    }

    const comment = await this.prisma.momentComment.create({
      data: {
        content: dto.content,
        momentId,
        userId,
        parentId: dto.parentId ?? null,
        replyToUserId: dto.replyToUserId ?? null,
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        replyToUser: { select: { id: true, username: true, avatar: true } },
      },
    });

    // 通知朋友圈作者
    if (moment.authorId !== userId) {
      await this.notificationsService.create({
        type: 'MOMENT_COMMENT',
        userId: moment.authorId,
        actorId: userId,
        momentId,
        commentId: comment.id,
        message: dto.replyToUserId ? '回复了你的朋友圈评论' : '评论了你的朋友圈',
      });
    }

    // 通知被回复的人（若存在且与作者、自己均不同）
    if (
      dto.replyToUserId &&
      dto.replyToUserId !== moment.authorId &&
      dto.replyToUserId !== userId
    ) {
      await this.notificationsService.create({
        type: 'MOMENT_COMMENT',
        userId: dto.replyToUserId,
        actorId: userId,
        momentId,
        commentId: comment.id,
        message: '回复了你的评论',
      });
    }

    return comment;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.momentComment.findUnique({
      where: { id: commentId },
      include: { moment: { select: { authorId: true } } },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.userId !== userId && comment.moment.authorId !== userId) {
      throw new ForbiddenException('Not authorized to delete this comment');
    }

    await this.prisma.momentComment.delete({ where: { id: commentId } });
    return { message: 'Comment deleted successfully' };
  }
}
