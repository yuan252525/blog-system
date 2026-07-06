import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../../database/prisma.module.js';
import { RedisModule } from '../../redis/redis.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { ChatGateway } from './chat.gateway.js';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    NotificationsModule,
    MulterModule.register({
      limits: { fileSize: 20 * 1024 * 1024 }, // 聊天文件上限 20MB
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '7d') as '7d' },
      }),
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
