import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';

// Redis 客户端注入 token 类型
export type RedisClient = Redis;

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const store = await redisStore({
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD') || undefined,
          db: config.get('REDIS_DB', 0),
          ttl: 60_000, // 默认 60s
        });
        return { store: store as any };
      },
    }),
  ],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService): RedisClient => {
        const options: RedisOptions = {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD') || undefined,
          db: config.get('REDIS_DB', 0),
          lazyConnect: true,
        };
        return new Redis(options);
      },
    },
  ],
  exports: [CacheModule, 'REDIS_CLIENT'],
})
export class RedisModule {}
