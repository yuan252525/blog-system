import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminService } from './admin.service.js';
import { UpdateUserDto, AdminCategoryDto, AdminTagDto, UpdateSettingsDto } from './admin.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

interface AdminRequest extends Request {
  user: { id: string; username: string; email: string; role: string };
}

@ApiTags('admin')
@Controller('admin')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ---------------- Users ----------------
  @Get('users')
  @ApiOperation({ summary: '管理员：用户列表（支持分页/搜索/角色/状态筛选）' })
  listUsers(@Query() query: Record<string, string>) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: '管理员：用户详情' })
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Put('users/:id')
  @ApiOperation({ summary: '管理员：更新用户角色 / 状态' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: '管理员：删除用户' })
  deleteUser(@Param('id') id: string, @Req() req: AdminRequest) {
    return this.adminService.deleteUser(id, req.user.id);
  }

  // ---------------- Comments ----------------
  @Get('comments')
  @ApiOperation({ summary: '管理员：评论列表（支持分页/搜索）' })
  listComments(@Query() query: Record<string, string>) {
    return this.adminService.listComments(query);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: '管理员：删除评论' })
  deleteComment(@Param('id') id: string) {
    return this.adminService.deleteComment(id);
  }

  // ---------------- Categories ----------------
  @Get('categories')
  @ApiOperation({ summary: '管理员：分类列表' })
  listCategories() {
    return this.adminService.listCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: '管理员：创建分类' })
  createCategory(@Body() dto: AdminCategoryDto) {
    return this.adminService.createCategory(dto);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: '管理员：更新分类' })
  updateCategory(@Param('id') id: string, @Body() dto: AdminCategoryDto) {
    return this.adminService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: '管理员：删除分类' })
  deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }

  // ---------------- Tags ----------------
  @Get('tags')
  @ApiOperation({ summary: '管理员：标签列表' })
  listTags() {
    return this.adminService.listTags();
  }

  @Post('tags')
  @ApiOperation({ summary: '管理员：创建标签' })
  createTag(@Body() dto: AdminTagDto) {
    return this.adminService.createTag(dto);
  }

  @Put('tags/:id')
  @ApiOperation({ summary: '管理员：更新标签' })
  updateTag(@Param('id') id: string, @Body() dto: AdminTagDto) {
    return this.adminService.updateTag(id, dto);
  }

  @Delete('tags/:id')
  @ApiOperation({ summary: '管理员：删除标签' })
  deleteTag(@Param('id') id: string) {
    return this.adminService.deleteTag(id);
  }

  // ---------------- Settings ----------------
  @Get('settings')
  @ApiOperation({ summary: '管理员：获取系统设置' })
  getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: '管理员：更新系统设置' })
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(dto);
  }
}
