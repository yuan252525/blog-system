import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import { RedisModule } from '../../redis/redis.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { GamificationModule } from '../gamification/gamification.module.js';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';

@Module({
  imports: [PrismaModule, RedisModule, forwardRef(() => NotificationsModule), GamificationModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
