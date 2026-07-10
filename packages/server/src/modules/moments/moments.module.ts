import { Module } from '@nestjs/common';
import { MomentsController } from './moments.controller.js';
import { MomentsService } from './moments.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { FollowModule } from '../follow/follow.module.js';

@Module({
  imports: [NotificationsModule, FollowModule],
  controllers: [MomentsController],
  providers: [MomentsService],
  exports: [MomentsService],
})
export class MomentsModule {}
