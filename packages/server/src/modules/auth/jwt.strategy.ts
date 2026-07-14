import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../../database/prisma.service.js';
import type { RedisClient } from '../../redis/redis.module.js';

interface JwtPayload {
  sub: string;
  username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redis: RedisClient,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    // 检查 token 是否在黑名单中（已登出）
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (token) {
      try {
        const isBlacklisted = await this.redis.get(`blacklist:${token}`);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token has been revoked, please login again');
        }
      } catch {
        // Redis 不可用时跳过黑名单检查（token 仍有效）
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, email: true, avatar: true, bio: true, points: true, level: true, role: true, status: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
