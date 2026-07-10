import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';
import { GamificationModule } from '../gamification/gamification.module.js';
import { FollowModule } from '../follow/follow.module.js';

@Module({
  imports: [GamificationModule, FollowModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
