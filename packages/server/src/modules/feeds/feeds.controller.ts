import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { FeedsService } from './feeds.service.js';

@ApiTags('feeds')
@Controller('feeds')
export class FeedsController {
  constructor(private feedsService: FeedsService) {}

  @Public()
  @Get('rss')
  @ApiOperation({ summary: 'RSS 订阅源', description: '返回最新公开文章的 RSS 2.0 XML' })
  async getRss(@Res() res: Response) {
    const xml = await this.feedsService.getRss();
    res.type('application/rss+xml; charset=utf-8').send(xml);
  }

  @Public()
  @Get('sitemap')
  @ApiOperation({ summary: 'Sitemap 站点地图', description: '返回站点的 XML Sitemap' })
  async getSitemap(@Res() res: Response) {
    const xml = await this.feedsService.getSitemap();
    res.type('application/xml; charset=utf-8').send(xml);
  }
}
