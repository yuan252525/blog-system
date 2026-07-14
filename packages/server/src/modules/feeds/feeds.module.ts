import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import { FeedsController } from './feeds.controller.js';
import { FeedsService } from './feeds.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [FeedsController],
  providers: [FeedsService],
})
export class FeedsModule {}
