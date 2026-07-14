import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service.js';
import { RegisterDto, LoginDto, UpdateProfileDto } from './auth.dto.js';
import type { RedisClient } from '../../redis/redis.module.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject('REDIS_CLIENT') private redis: RedisClient,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === dto.email) {
        throw new ConflictException('Email already exists');
      }
      throw new ConflictException('Username already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 系统首个注册用户自动成为管理员
    const userCount = await this.prisma.user.count();
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        role: userCount === 0 ? 'ADMIN' : 'USER',
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        points: true,
        level: true,
        lastCheckIn: true,
        checkInStreak: true,
        role: true,
      },
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      username: user.username,
    });

    return {
      accessToken,
      user: {
        ...user,
        lastCheckIn: user.lastCheckIn ? user.lastCheckIn.toISOString() : null,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === 'BANNED') {
      throw new UnauthorizedException('Your account has been banned');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      username: user.username,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        points: user.points,
        level: user.level,
        role: user.role,
        lastCheckIn: user.lastCheckIn ? user.lastCheckIn.toISOString() : null,
        checkInStreak: user.checkInStreak,
      },
    };
  }

  /** 登出：将 token 加入 Redis 黑名单，有效期 = token 剩余有效时间 */
  async logout(token: string) {
    try {
      const decoded = this.jwtService.decode(token) as { exp?: number } | null;
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redis.set(`blacklist:${token}`, '1', 'EX', ttl);
        }
      }
    } catch {
      // Redis 不可用时，token 仅依赖过期时间自动失效
    }
    return { message: 'Logged out successfully' };
  }

  /** 检查 token 是否在黑名单中 */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const result = await this.redis.get(`blacklist:${token}`);
      return result !== null;
    } catch {
      return false;
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        createdAt: true,
        points: true,
        level: true,
        role: true,
        lastCheckIn: true,
        checkInStreak: true,
        _count: { select: { posts: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      ...user,
      lastCheckIn: user.lastCheckIn ? user.lastCheckIn.toISOString() : null,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.username) {
      const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Username already taken');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.username !== undefined && { username: dto.username }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        createdAt: true,
        points: true,
        level: true,
        role: true,
        lastCheckIn: true,
        checkInStreak: true,
      },
    });

    return {
      ...user,
      lastCheckIn: user.lastCheckIn ? user.lastCheckIn.toISOString() : null,
    };
  }
}
