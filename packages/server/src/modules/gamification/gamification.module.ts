import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import { RedisModule } from '../../redis/redis.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { GamificationController } from './gamification.controller.js';
import { GamificationService } from './gamification.service.js';

@Module({
  imports: [PrismaModule, RedisModule, NotificationsModule],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
