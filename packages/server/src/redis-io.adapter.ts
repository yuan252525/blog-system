import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { ServerOptions } from 'socket.io';

/**
 * 基于 Redis 的 Socket.IO Adapter。
 *
 * 作用：让 WebSocket 通知可以跨多个后端实例广播，从而支持水平扩展，
 * 应对 2000+ 并发长连接场景。
 *
 * 兼容性：Redis 不可用时自动降级为默认内存 Adapter（单实例行为完全不变），
 * 不会阻塞应用启动，本地开发无 Redis 也能正常运行。
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  async connectToRedis(): Promise<void> {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = Number(process.env.REDIS_PORT ?? 6379);

    const pubClient = new Redis({
      host,
      port,
      lazyConnect: true,
      connectTimeout: 2000,
    });
    const subClient = pubClient.duplicate();

    try {
      // 给初始连接一个较短超时，避免 Redis 不可用时阻塞启动
      await Promise.race([
        Promise.all([pubClient.connect(), subClient.connect()]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('redis connect timeout')), 2000),
        ),
      ]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
      // eslint-disable-next-line no-console
      console.log('[RedisIoAdapter] Connected to Redis, WebSocket scaling enabled');
    } catch {
      // 降级为内存模式：通知仅在当前实例内生效（单实例部署完全正常）
      pubClient.disconnect();
      subClient.disconnect();
      this.adapterConstructor = null;
      // eslint-disable-next-line no-console
      console.warn(
        '[RedisIoAdapter] Redis unavailable, falling back to in-memory adapter (single-instance mode)',
      );
    }
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
