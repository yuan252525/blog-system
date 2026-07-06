import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigModule } from './config/config.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PostsModule } from './modules/posts/posts.module.js';
import { TagsModule } from './modules/tags/tags.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { CommentsModule } from './modules/comments/comments.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { LikesModule } from './modules/likes/likes.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    PostsModule,
    TagsModule,
    UploadsModule,
    CommentsModule,
    CategoriesModule,
    LikesModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
