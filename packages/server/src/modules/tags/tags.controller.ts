import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TagsService } from './tags.service.js';
import { Public } from '../../common/decorators/public.decorator.js';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private tagsService: TagsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '获取所有标签', description: '返回系统中所有标签列表' })
  @ApiResponse({ status: 200, description: '标签列表' })
  findAll() {
    return this.tagsService.findAll();
  }

  @Public()
  @Get(':slug/posts')
  @ApiOperation({ summary: '根据标签获取文章', description: '根据标签 slug 查询该标签下的所有文章，支持分页' })
  @ApiResponse({ status: 200, description: '返回该标签下的文章列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 10 })
  findPostsByTag(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tagsService.findPostsByTag(slug, Number(page) || 1, Number(limit) || 10);
  }
}
