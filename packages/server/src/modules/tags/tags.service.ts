import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class TagsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll() {
    const cacheKey = 'tags:all';

    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) return cached;
    } catch {
      // Redis 不可用时降级
    }

    const tags = await this.prisma.tag.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      postCount: tag._count.posts,
    }));

    try {
      await this.cacheManager.set(cacheKey, result, 300_000);
    } catch {
      // Redis 不可用时忽略
    }

    return result;
  }

  async findPostsByTag(slug: string, page: number, limit: number) {
    const cacheKey = `tags:posts:${slug}:${page}:${limit}`;

    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) return cached;
    } catch {
      // Redis 不可用时降级
    }

    const tag = await this.prisma.tag.findUnique({ where: { slug } });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          status: 'PUBLISHED',
          tags: { some: { tagId: tag.id } },
        },
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
        },
      }),
      this.prisma.post.count({
        where: {
          status: 'PUBLISHED',
          tags: { some: { tagId: tag.id } },
        },
      }),
    ]);

    const result = {
      tag,
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
}
