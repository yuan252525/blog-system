import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

interface SiteSettings {
  siteTitle: string;
  siteDescription: string;
  contactEmail: string;
}

@Injectable()
export class FeedsService {
  constructor(private prisma: PrismaService) {}

  private get baseUrl(): string {
    return (process.env.CLIENT_URL || 'http://localhost:5178').replace(/\/$/, '');
  }

  private postUrl(slug: string): string {
    return `${this.baseUrl}/#/posts/${slug}`;
  }

  private escapeXml(input: string | null | undefined): string {
    if (!input) return '';
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /** 从 Markdown 内容中提取纯文本摘要 */
  private excerpt(content: string, maxLen = 200): string {
    const text = content
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_`~]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
  }

  private async getSiteSettings(): Promise<SiteSettings> {
    const defaults: SiteSettings = {
      siteTitle: 'My Blog',
      siteDescription: 'A blog built with the blog-system',
      contactEmail: '',
    };
    try {
      const rows = await this.prisma.setting.findMany();
      const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
      return {
        siteTitle: map.siteTitle || defaults.siteTitle,
        siteDescription: map.siteDescription || defaults.siteDescription,
        contactEmail: map.contactEmail || defaults.contactEmail,
      };
    } catch {
      return defaults;
    }
  }

  async getRss(): Promise<string> {
    const settings = await this.getSiteSettings();
    const posts = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      include: {
        author: { select: { username: true } },
        category: { select: { name: true } },
      },
    });

    const items = posts
      .map((post) => {
        const url = this.postUrl(post.slug);
        const description = this.escapeXml(post.summary || this.excerpt(post.content));
        const pubDate = post.publishedAt
          ? new Date(post.publishedAt).toUTCString()
          : new Date().toUTCString();
        return `    <item>
      <title>${this.escapeXml(post.title)}</title>
      <link>${this.escapeXml(url)}</link>
      <guid isPermaLink="true">${this.escapeXml(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>${this.escapeXml(post.author.username)}</dc:creator>
      ${post.category ? `<category>${this.escapeXml(post.category.name)}</category>` : ''}
      <description>${description}</description>
    </item>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${this.escapeXml(settings.siteTitle)}</title>
    <link>${this.escapeXml(this.baseUrl)}</link>
    <atom:link href="${this.escapeXml(this.baseUrl + '/api/v1/feeds/rss')}" rel="self" type="application/rss+xml" />
    <description>${this.escapeXml(settings.siteDescription)}</description>
    ${settings.contactEmail ? `<managingEditor>${this.escapeXml(settings.contactEmail)}</managingEditor>` : ''}
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
  }

  async getSitemap(): Promise<string> {
    const [posts, categories] = await Promise.all([
      this.prisma.post.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        select: { slug: true, updatedAt: true },
      }),
      this.prisma.category.findMany({ select: { slug: true } }),
    ]);

    const urls: string[] = [];
    urls.push(this.urlEl(`${this.baseUrl}/`, null, 'daily', '1.0'));
    for (const p of posts) {
      urls.push(this.urlEl(this.postUrl(p.slug), p.updatedAt, 'weekly', '0.8'));
    }
    for (const c of categories) {
      urls.push(this.urlEl(`${this.baseUrl}/#/categories/${c.slug}`, null, 'monthly', '0.5'));
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  }

  private urlEl(
    loc: string,
    lastmod: Date | null,
    changefreq: string,
    priority: string,
  ): string {
    return `  <url>
    <loc>${this.escapeXml(loc)}</loc>
    ${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }
}
