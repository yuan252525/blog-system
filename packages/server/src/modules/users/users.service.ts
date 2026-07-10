import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /** 按 username 获取公开资料（含文章数 / 粉丝数 / 关注数 / 积分等级） */
  async getByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        createdAt: true,
        points: true,
        level: true,
        _count: {
          select: { posts: true, followers: true, following: true },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
