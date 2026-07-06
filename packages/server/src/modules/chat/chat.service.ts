import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../../generated/prisma/client.js';

export interface ChatMessageWithRelations {
  id: string;
  content: string;
  type: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: string | null;
  mimeType: string | null;
  roomId: string;
  userId: string;
  createdAt: Date;
  user: { id: string; username: string; avatar: string | null };
  mentions: Array<{ user: { id: string; username: string } }>;
}

interface CreateRoomInput {
  name: string;
  description?: string;
}

interface SendMessageInput {
  roomId: string;
  content: string;
  type?: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  mentions?: string[]; // userIds
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private prisma: PrismaService) {}

  // ==================== 房间管理 ====================

  /** 创建聊天室（群聊），自动加入创建者 */
  async createRoom(userId: string, input: CreateRoomInput) {
    const room = await this.prisma.chatRoom.create({
      data: {
        name: input.name,
        description: input.description,
        type: 'GROUP',
        createdById: userId,
        members: {
          create: { userId },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
        _count: { select: { members: true } },
      },
    });

    return room;
  }

  /** 获取或创建私聊房间 */
  async getOrCreateDirectRoom(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('Cannot chat with yourself');
    }

    // 查找已有私聊房间（两个成员正好是 userId 和 targetUserId）
    const userRooms = await this.prisma.chatRoomMember.findMany({
      where: { userId },
      select: { roomId: true },
    });
    const userRoomIds = userRooms.map((m) => m.roomId);

    const existing = await this.prisma.chatRoom.findFirst({
      where: {
        type: 'DIRECT',
        id: { in: userRoomIds },
        members: {
          every: {
            userId: { in: [userId, targetUserId] },
          },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
      },
    });

    if (existing) return existing;

    // 获取双方用户名来生成房间名
    const [user, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { username: true } }),
      this.prisma.user.findUnique({ where: { id: targetUserId }, select: { username: true } }),
    ]);

    if (!target) throw new NotFoundException('User not found');

    return this.prisma.chatRoom.create({
      data: {
        name: `${user?.username ?? 'User'}, ${target.username}`,
        type: 'DIRECT',
        createdById: userId,
        members: {
          create: [{ userId }, { userId: targetUserId }],
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
      },
    });
  }

  /** 获取用户所有聊天室 */
  async getUserRooms(userId: string) {
    const memberships = await this.prisma.chatRoomMember.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            members: {
              include: { user: { select: { id: true, username: true, avatar: true } } },
            },
            _count: { select: { members: true } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                content: true,
                type: true,
                createdAt: true,
                user: { select: { username: true } },
              },
            },
          },
        },
      },
      orderBy: { room: { updatedAt: 'desc' } },
    });

    return memberships.map((m) => {
      const latestMsg = m.room.messages[0] ?? null;
      return {
        id: m.room.id,
        name: m.room.name,
        description: m.room.description,
        type: m.room.type,
        memberCount: m.room._count.members,
        members: m.room.members.map((mb) => mb.user),
        latestMessage: latestMsg
          ? {
              id: latestMsg.id,
              content: latestMsg.content,
              type: latestMsg.type,
              createdAt: latestMsg.createdAt,
              username: latestMsg.user.username,
            }
          : null,
        lastReadAt: m.lastReadAt,
        joinedAt: m.joinedAt,
      };
    });
  }

  /** 加入群聊 */
  async joinRoom(userId: string, roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.type !== 'GROUP') throw new BadRequestException('Cannot join a direct chat room');

    const existing = await this.prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (existing) return existing;

    return this.prisma.chatRoomMember.create({
      data: { roomId, userId },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    });
  }

  /** 离开群聊 */
  async leaveRoom(userId: string, roomId: string) {
    const member = await this.prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) throw new NotFoundException('Not a member of this room');

    await this.prisma.chatRoomMember.delete({ where: { id: member.id } });

    // 如果房间没人了，删除房间
    const remaining = await this.prisma.chatRoomMember.count({ where: { roomId } });
    if (remaining === 0) {
      await this.prisma.chatRoom.delete({ where: { id: roomId } });
    }

    return { success: true };
  }

  /** 获取房间详情 */
  async getRoom(roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
        _count: { select: { members: true } },
      },
    });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  /** 获取房间成员 */
  async getRoomMembers(roomId: string) {
    const members = await this.prisma.chatRoomMember.findMany({
      where: { roomId },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    });
    return members.map((m) => ({ ...m.user, joinedAt: m.joinedAt }));
  }

  // ==================== 消息管理 ====================

  /** 将 Prisma 返回的 bigint fileSize 转为 string，避免 JSON.stringify 报错 */
  private serializeMessage<T extends { fileSize: bigint | null }>(msg: T): Omit<T, 'fileSize'> & { fileSize: string | null } {
    return { ...msg, fileSize: msg.fileSize?.toString() ?? null };
  }

  /** 发送消息 */
  async sendMessage(userId: string, input: SendMessageInput): Promise<ChatMessageWithRelations> {
    // 验证用户是否是房间成员
    const member = await this.prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId: input.roomId, userId } },
    });
    if (!member) throw new BadRequestException('Not a member of this room');

    const messageType = input.type ?? 'TEXT';

    const data: Prisma.ChatMessageCreateInput = {
      content: input.content,
      type: messageType,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      fileSize: input.fileSize ? BigInt(input.fileSize) : null,
      mimeType: input.mimeType,
      room: { connect: { id: input.roomId } },
      user: { connect: { id: userId } },
    };

    // @ 提及
    if (input.mentions && input.mentions.length > 0) {
      const validMentions = input.mentions.filter((id) => id !== userId);
      if (validMentions.length > 0) {
        (data as any).mentions = {
          create: validMentions.map((mentionedId) => ({
            user: { connect: { id: mentionedId } },
          })),
        };
      }
    }

    const message = await this.prisma.chatMessage.create({
      data,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        mentions: {
          include: { user: { select: { id: true, username: true } } },
        },
      },
    });

    // 更新最后阅读时间
    await this.prisma.chatRoomMember.update({
      where: { roomId_userId: { roomId: input.roomId, userId } },
      data: { lastReadAt: new Date() },
    });

    return this.serializeMessage(message);
  }

  /** 获取消息历史（分页） */
  async getMessages(roomId: string, userId: string, page = 1, limit = 50) {
    // 验证用户是成员
    const member = await this.prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) throw new BadRequestException('Not a member of this room');

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          mentions: {
            include: { user: { select: { id: true, username: true } } },
          },
        },
      }),
      this.prisma.chatMessage.count({ where: { roomId } }),
    ]);

    return {
      data: messages.reverse().map((m) => this.serializeMessage(m)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  }

  /** 标记已读 */
  async markAsRead(userId: string, roomId: string) {
    await this.prisma.chatRoomMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: { lastReadAt: new Date() },
    });
  }

  /** 获取未读消息数 */
  async getUnreadCount(userId: string, roomId: string) {
    const member = await this.prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) return 0;

    const where: Prisma.ChatMessageWhereInput = { roomId };
    if (member.lastReadAt) {
      where.createdAt = { gt: member.lastReadAt };
    }

    return this.prisma.chatMessage.count({ where });
  }

  /** 获取可发现的群聊（用户未加入的 GROUP 房间） */
  async getDiscoverableRooms(userId: string) {
    const userRoomIds = (
      await this.prisma.chatRoomMember.findMany({
        where: { userId },
        select: { roomId: true },
      })
    ).map((m) => m.roomId);

    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        type: 'GROUP',
        ...(userRoomIds.length > 0 ? { id: { notIn: userRoomIds } } : {}),
      },
      include: {
        createdBy: { select: { id: true, username: true, avatar: true } },
        _count: { select: { members: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return rooms.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      memberCount: r._count.members,
      createdBy: r.createdBy,
    }));
  }

  /** 邀请用户加入群聊 */
  async inviteUsers(roomId: string, inviterId: string, userIds: string[]) {
    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.type !== 'GROUP') throw new BadRequestException('Cannot invite to direct chat');

    // 验证邀请者是成员
    const inviter = await this.prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId: inviterId } },
    });
    if (!inviter) throw new BadRequestException('Only members can invite others');

    // 批量加入（跳过已在房间内的）
    const existingMembers = await this.prisma.chatRoomMember.findMany({
      where: { roomId, userId: { in: userIds } },
      select: { userId: true },
    });
    const existingIds = new Set(existingMembers.map((m) => m.userId));
    const newUserIds = userIds.filter((id) => !existingIds.has(id));

    if (newUserIds.length > 0) {
      await this.prisma.chatRoomMember.createMany({
        data: newUserIds.map((uid) => ({ roomId, userId: uid })),
      });
    }

    // 发送系统消息
    const inviterUser = await this.prisma.user.findUnique({
      where: { id: inviterId },
      select: { username: true },
    });

    if (newUserIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: newUserIds } },
        select: { username: true },
      });
      const names = users.map((u) => u.username).join(', ');

      await this.prisma.chatMessage.create({
        data: {
          content: `${inviterUser?.username ?? 'Someone'} 邀请了 ${names} 加入群聊`,
          type: 'SYSTEM',
          room: { connect: { id: roomId } },
          user: { connect: { id: inviterId } },
        },
      });
    }

    return { invited: newUserIds.length, skipped: userIds.length - newUserIds.length };
  }

  /** 搜索用户（用于 @ 提及和创建私聊） */
  async searchUsers(query: string, excludeUserId: string) {
    return this.prisma.user.findMany({
      where: {
        id: { not: excludeUserId },
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, username: true, email: true, avatar: true },
      take: 20,
    });
  }
}
