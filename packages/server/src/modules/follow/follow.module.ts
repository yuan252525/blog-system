import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { FollowService } from './follow.service.js';
import { FollowController } from './follow.controller.js';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [FollowController],
  providers: [FollowService],
  exports: [FollowService],
})
export class FollowModule {}
