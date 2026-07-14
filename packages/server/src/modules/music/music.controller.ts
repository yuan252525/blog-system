import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { MusicService, MusicTrack } from './music.service.js';
import { SearchMusicQuery } from './music.dto.js';

@ApiTags('music')
@Controller('music')
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @Public()
  @Get('search')
  @ApiOperation({
    summary: '汽水音乐搜索',
    description: '通过后端代理搜索汽水音乐，返回归一化后的可播放曲目列表',
  })
  @ApiResponse({ status: 200, description: '曲目列表' })
  async search(@Query() query: SearchMusicQuery): Promise<MusicTrack[]> {
    try {
      return await this.musicService.search(query.q, query.limit ?? 6, query.offset ?? 0);
    } catch (err) {
      throw new HttpException(
        (err as Error).message ?? '音乐服务暂不可用',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
