import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { UpdateUserDto, AdminCategoryDto, AdminTagDto, UpdateSettingsDto } from './admin.dto.js';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ====================== Users ======================
  async listUsers(query: { page?: number; limit?: number; search?: string; role?: string; status?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { username: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          role: true,
          status: true,
          points: true,
          level: true,
          createdAt: true,
          _count: { select: { posts: true, comments: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        status: true,
        points: true,
        level: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { posts: true, comments: true, followers: true, following: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      select: { id: true, username: true, email: true, role: true, status: true },
    });
  }

  async deleteUser(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }

  // ====================== Comments ======================
  async listComments(query: { page?: number; limit?: number; search?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.search) {
      where.content = { contains: query.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          post: { select: { id: true, title: true } },
          _count: { select: { replies: true, likes: true } },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async deleteComment(id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    await this.prisma.comment.delete({ where: { id } });
    return { message: 'Comment deleted successfully' };
  }

  // ====================== Categories ======================
  private generateCategorySlug(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9一-龥]+/g, '-')
      .replace(/^-|-$/g, '');
    return slug || `cat-${Date.now().toString(36)}`;
  }

  async listCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
  }

  async createCategory(dto: AdminCategoryDto) {
    const slug = this.generateCategorySlug(dto.name);
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Category already exists');
    return this.prisma.category.create({
      data: { name: dto.name, slug, description: dto.description },
    });
  }

  async updateCategory(id: string, dto: AdminCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
      data.slug = this.generateCategorySlug(dto.name);
    }
    if (dto.description !== undefined) data.description = dto.description;
    return this.prisma.category.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }

  // ====================== Tags ======================
  private generateTagSlug(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || `tag-${Date.now().toString(36)}`;
  }

  async listTags() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
  }

  async createTag(dto: AdminTagDto) {
    const slug = this.generateTagSlug(dto.name);
    const existing = await this.prisma.tag.findUnique({ where: { slug } });
    if (existing) return existing;
    return this.prisma.tag.create({ data: { name: dto.name, slug } });
  }

  async updateTag(id: string, dto: AdminTagDto) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');
    const slug = this.generateTagSlug(dto.name);
    const conflict = await this.prisma.tag.findUnique({ where: { slug } });
    if (conflict && conflict.id !== id) throw new ConflictException('Tag already exists');
    return this.prisma.tag.update({ where: { id }, data: { name: dto.name, slug } });
  }

  async deleteTag(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.prisma.tag.delete({ where: { id } });
    return { message: 'Tag deleted successfully' };
  }

  // ====================== Settings ======================
  private readonly defaultSettings: Record<string, string> = {
    siteTitle: 'My Blog',
    siteDescription: 'A minimalist, elegant blog platform focused on quality content.',
    siteKeywords: '',
    contactEmail: '',
    postsPerPage: '10',
  };

  async getSettings() {
    const rows = await this.prisma.setting.findMany();
    const settings: Record<string, string> = { ...this.defaultSettings };
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const keys = Object.keys(dto).filter((k) => dto[k as keyof UpdateSettingsDto] !== undefined && dto[k as keyof UpdateSettingsDto] !== null);
    for (const key of keys) {
      const value = String(dto[key as keyof UpdateSettingsDto]);
      await this.prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    return this.getSettings();
  }
}
