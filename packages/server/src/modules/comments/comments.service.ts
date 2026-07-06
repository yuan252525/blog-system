import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateCommentDto, UpdateCommentDto } from './comments.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationsGateway } from '../notifications/notifications.gateway.js';

const commentInclude = {
  user: { select: { id: true, username: true, avatar: true } },
  _count: { select: { likes: true } },
} as const;

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => NotificationsGateway))
    private notificationsGateway: NotificationsGateway,
  ) {}

  async findByPostId(postId: string, currentUserId?: string) {
    const comments = await this.prisma.comment.findMany({
      where: { postId, parentId: null },
      include: {
        ...commentInclude,
        replies: {
          include: {
            ...commentInclude,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (currentUserId) {
      const commentIds = new Set<string>();
      for (const c of comments) {
        commentIds.add(c.id);
        for (const r of c.replies) commentIds.add(r.id);
      }
      const userLikes = await this.prisma.commentLike.findMany({
        where: { userId: currentUserId, commentId: { in: [...commentIds] } },
        select: { commentId: true },
      });
      const likedSet = new Set(userLikes.map((l) => l.commentId));
      return comments.map((c) => ({
        ...c,
        isLiked: likedSet.has(c.id),
        replies: c.replies.map((r) => ({ ...r, isLiked: likedSet.has(r.id) })),
      }));
    }

    return comments;
  }

  async create(userId: string, dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: dto.postId },
      select: { id: true, title: true, slug: true, authorId: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    let parentComment: { id: string; userId: string } | null = null;
    if (dto.parentId) {
      parentComment = await this.prisma.comment.findUnique({
        where: { id: dto.parentId, postId: dto.postId },
        select: { id: true, userId: true },
      });
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        postId: dto.postId,
        userId,
        parentId: dto.parentId || null,
      },
      include: {
        ...commentInclude,
      },
    });

    // ====== 通知逻辑 ======
    // 1. 如果是回复（parentId 存在），通知被回复的用户
    if (parentComment && parentComment.userId !== userId) {
      try {
        const notif = await this.notificationsService.create({
          type: 'COMMENT_REPLY',
          userId: parentComment.userId,
          actorId: userId,
          postId: dto.postId,
          commentId: comment.id,
          message: `${comment.user.username} 回复了你的评论`,
        });
        if (notif) {
          this.notificationsGateway.sendNotificationToUser(parentComment.userId, notif);
          const { count } = await this.notificationsService.getUnreadCount(parentComment.userId);
          this.notificationsGateway.sendUnreadCountToUser(parentComment.userId, count);
        }
      } catch (err) {
        this.logger.error('Failed to create reply notification', err);
      }
    }

    // 2. 如果是根评论（无 parentId），通知文章作者
    if (!dto.parentId && post.authorId !== userId) {
      try {
        const notif = await this.notificationsService.create({
          type: 'COMMENT_REPLY',
          userId: post.authorId,
          actorId: userId,
          postId: dto.postId,
          commentId: comment.id,
          message: `${comment.user.username} 评论了你的文章《${post.title}》`,
        });
        if (notif) {
          this.notificationsGateway.sendNotificationToUser(post.authorId, notif);
          const { count } = await this.notificationsService.getUnreadCount(post.authorId);
          this.notificationsGateway.sendUnreadCountToUser(post.authorId, count);
        }
      } catch (err) {
        this.logger.error('Failed to create comment notification', err);
      }
    }

    return comment;
  }

  async update(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException();

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content },
      include: {
        ...commentInclude,
      },
    });
  }

  async delete(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException();

    await this.prisma.comment.delete({ where: { id: commentId } });
    return { success: true };
  }

  async like(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, postId: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const existing = await this.prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });
    if (existing) {
      // Unlike
      await this.prisma.commentLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }
    // Like
    const like = await this.prisma.commentLike.create({ data: { commentId, userId } });

    // ====== 通知逻辑：评论被赞 ======
    if (comment.userId !== userId) {
      try {
        const notif = await this.notificationsService.create({
          type: 'COMMENT_LIKE',
          userId: comment.userId,
          actorId: userId,
          postId: comment.postId,
          commentId: commentId,
          message: `有人赞了你的评论`,
        });
        if (notif) {
          this.notificationsGateway.sendNotificationToUser(comment.userId, notif);
          const { count } = await this.notificationsService.getUnreadCount(comment.userId);
          this.notificationsGateway.sendUnreadCountToUser(comment.userId, count);
        }
      } catch (err) {
        this.logger.error('Failed to create comment like notification', err);
      }
    }

    return { liked: true };
  }
}
