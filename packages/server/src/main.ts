import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import bodyParser from 'body-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { RedisIoAdapter } from './redis-io.adapter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    // 允许配置的前端域名（生产）；开发环境下放行 localhost 各端口
    // （Vite 默认 5173，本项目为 5178），否则 jit-pdf 跨端口加载 PDF 会被 CORS 拦截
    origin: (origin: any, cb: (err: Error | null, allow?: boolean) => void) => {
      const clientUrl = process.env.CLIENT_URL;
      if (!origin || origin === clientUrl) return cb(null, true);
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, origin);
      cb(null, true);
    },
    credentials: true,
  });

  // Express 5 默认 strict:true 会在某些边界情况把 body 变成 "[object Object]"
  // 改为 strict:false 让 JSON 解析更宽容，同时支持 10MB body
  app.use(bodyParser.json({ strict: false, limit: '10mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 请求日志
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger / OpenAPI 文档
  const config = new DocumentBuilder()
    .setTitle('博客系统 API')
    .setDescription('博客系统的 RESTful API 接口文档')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', '认证相关')
    .addTag('posts', '文章管理')
    .addTag('tags', '标签管理')
    .addTag('uploads', '文件上传（断点续传）')
    .addTag('comments', '评论管理')
    .addTag('likes', '点赞管理')
    .addTag('notifications', '消息通知')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // WebSocket 水平扩展：启用 Redis Adapter，
  // 多实例部署时通知可跨实例广播；Redis 不可用时自动降级为单实例内存模式
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`📖 Swagger 文档: http://localhost:${process.env.PORT ?? 3000}/docs`);
}
bootstrap();
