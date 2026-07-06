/* eslint-disable camelcase */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../database/prisma.service.js';
import { CreatePostDto, UpdatePostDto, QueryPostsDto } from './posts.dto.js';
import type { RedisClient } from '../../redis/redis.module.js';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject('REDIS_CLIENT') private redis: RedisClient,
  ) {}

  private generateSlug(title: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!slug) {
      return `post-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    return slug;
  }

  private async ensureUniqueSlug(slug: string): Promise<string> {
    const existing = await this.prisma.post.findUnique({ where: { slug } });
    if (!existing) return slug;

    let suffix = 2;
    let newSlug: string;
    do {
      newSlug = `${slug}-${suffix}`;
      const conflict = await this.prisma.post.findUnique({ where: { slug: newSlug } });
      if (!conflict) return newSlug;
      suffix++;
    } while (suffix < 100);

    return `${slug}-${Date.now().toString(36)}`;
  }

  private async processTags(tagNames: string[]) {
    if (!tagNames || tagNames.length === 0) return [];

    const tags = await Promise.all(
      tagNames.map(async (name) => {
        const slug = this.generateSlug(name);
        return this.prisma.tag.upsert({
          where: { slug },
          update: { name },
          create: { name, slug },
        });
      }),
    );

    return tags;
  }

  /** 清除所有文章列表缓存和标签缓存 */
  private async clearListCaches(slug?: string) {
    const patterns = ['posts:list:*', 'tags:*'];
    if (slug) {
      patterns.push(`posts:slug:${slug}`);
    }

    for (const pattern of patterns) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      } catch {
        // Redis 不可用时忽略
      }
    }
  }

  async findAll(query: QueryPostsDto, authorId?: string) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    // 缓存 key
    const cacheKey = `posts:list:${page}:${limit}:${query.status || 'all'}:${query.search || ''}:${query.tag || ''}:${query.category || ''}:${authorId || 'public'}`;

    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) return cached;
    } catch {
      // Redis 不可用时降级到直接查库
    }

    const where: Record<string, unknown> = {};

    if (authorId) {
      where.authorId = authorId;
    } else {
      where.status = 'PUBLISHED';
    }

    if (query.status && authorId) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { summary: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.tag) {
      where.tags = {
        some: {
          tag: { slug: query.tag },
        },
      };
    }

    if (query.category) {
      where.category = { slug: query.category };
    }

    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        where: where as never,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          author: {
            select: { id: true, username: true, avatar: true },
          },
          tags: {
            select: {
              tag: { select: { id: true, name: true, slug: true } },
            },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: { comments: true, likes: true },
          },
        },
      }),
      this.prisma.post.count({ where: where as never }),
    ]);

    const result = {
      data: data.map((post) => ({
        ...post,
        tags: post.tags.map((pt) => pt.tag),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    try {
      await this.cacheManager.set(cacheKey, result, 60_000);
    } catch {
      // Redis 不可用时忽略
    }

    return result;
  }

  /** 根据 slug 获取文章详情，带 IP 去重的阅读计数 */
  async findBySlug(slug: string, clientIp?: string) {
    const post = await this.prisma.post.findUnique({
      where: { slug },
      include: {
        author: {
          select: { id: true, username: true, avatar: true, bio: true },
        },
        tags: {
          select: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { comments: true, likes: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Redis 去重阅读计数：同一 IP 5 分钟内不重复计数
    const dedupIp = clientIp || 'unknown';
    const dedupKey = `view:dedup:${post.id}:${dedupIp}`;
    let shouldCount = true;

    try {
      const result = await this.redis.set(dedupKey, '1', 'EX', 300, 'NX');
      shouldCount = result !== null;
    } catch {
      // Redis 不可用时，仍然计数（降级无去重）
    }

    if (shouldCount) {
      await this.prisma.post.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return {
      ...post,
      tags: post.tags.map((pt) => pt.tag),
      viewCount: shouldCount ? post.viewCount + 1 : post.viewCount,
    };
  }

  async create(dto: CreatePostDto, authorId: string) {
    const slug = await this.ensureUniqueSlug(this.generateSlug(dto.title));

    const tags = await this.processTags(dto.tags ?? []);

    const post = await this.prisma.post.create({
      data: {
        title: dto.title,
        slug,
        content: dto.content,
        summary: dto.summary ?? null,
        coverImage: dto.coverImage ?? null,
        status: dto.status ?? 'DRAFT',
        publishedAt: dto.status === 'PUBLISHED' ? new Date() : null,
        categoryId: dto.categoryId ?? null,
        authorId,
        tags: {
          create: tags.map((tag) => ({ tagId: tag.id })),
        },
      },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        tags: {
          select: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // 缓存失效
    await this.clearListCaches();

    return {
      ...post,
      tags: post.tags.map((pt) => pt.tag),
    };
  }

  async update(id: string, dto: UpdatePostDto, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    let newSlug = post.slug;
    if (dto.title && dto.title !== post.title) {
      newSlug = await this.ensureUniqueSlug(this.generateSlug(dto.title));
    }

    let publishedAt = post.publishedAt;
    if (dto.status === 'PUBLISHED' && post.status !== 'PUBLISHED') {
      publishedAt = new Date();
    }

    if (dto.tags !== undefined) {
      await this.prisma.postTag.deleteMany({ where: { postId: id } });
      const newTags = await this.processTags(dto.tags);
      await this.prisma.postTag.createMany({
        data: newTags.map((tag) => ({ postId: id, tagId: tag.id })),
      });
    }

    const updated = await this.prisma.post.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.title !== undefined && { slug: newSlug }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
        ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        publishedAt,
      },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        tags: {
          select: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // 缓存失效（新旧 slug 都清）
    await this.clearListCaches(newSlug);
    if (post.slug !== newSlug) {
      await this.clearListCaches(post.slug);
    }

    return {
      ...updated,
      tags: updated.tags.map((pt) => pt.tag),
    };
  }

  async delete(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.prisma.post.delete({ where: { id } });

    // 缓存失效
    await this.clearListCaches(post.slug);

    return { message: 'Post deleted successfully' };
  }

  /** 获取相关文章（基于相同标签或分类） */
  async getRelatedPosts(postId: string, limit = 3) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { tags: { select: { tagId: true } } },
    });

    if (!post || post.tags.length === 0) {
      // 无标签时返回最新文章
      return this.prisma.post.findMany({
        where: { id: { not: postId }, status: 'PUBLISHED' },
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, avatar: true } },
          tags: {
            select: { tag: { select: { id: true, name: true, slug: true } } },
          },
        },
      });
    }

    const tagIds = post.tags.map((pt) => pt.tagId);

    return this.prisma.post.findMany({
      where: {
        id: { not: postId },
        status: 'PUBLISHED',
        tags: { some: { tagId: { in: tagIds } } },
      },
      take: limit,
      orderBy: { publishedAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        tags: {
          select: { tag: { select: { id: true, name: true, slug: true } } },
        },
      },
    });
  }
}
