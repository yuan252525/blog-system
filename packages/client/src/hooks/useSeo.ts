import { useEffect } from 'react';

interface SeoOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  publishedTime?: string;
  siteName?: string;
}

function upsertMeta(selector: string, key: string, attr: 'name' | 'property', content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * 为当前页面设置文档标题与 SEO/OG/Twitter meta 标签。
 * SPA（HashRouter）下搜索引擎抓取有限，但社交分享卡片（微信/Telegram/X 等）
 * 仍依赖 og:* 标签，故在详情页等关键位置注入。
 */
export function useSeo(options: SeoOptions) {
  const { title, description, image, url, type = 'website', publishedTime, siteName = 'My Blog' } =
    options;

  useEffect(() => {
    const fullTitle = title ? `${title} · ${siteName}` : siteName;
    document.title = fullTitle;

    if (description) {
      upsertMeta('meta[name="description"]', 'description', 'name', description);
    }
    upsertMeta('meta[property="og:title"]', 'og:title', 'property', fullTitle);
    if (description) {
      upsertMeta('meta[property="og:description"]', 'og:description', 'property', description);
    }
    upsertMeta('meta[property="og:type"]', 'og:type', 'property', type);
    upsertMeta('meta[property="og:site_name"]', 'og:site_name', 'property', siteName);
    if (image) upsertMeta('meta[property="og:image"]', 'og:image', 'property', image);
    if (url) {
      upsertMeta('meta[property="og:url"]', 'og:url', 'property', url);
      let canon = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canon) {
        canon = document.createElement('link');
        canon.setAttribute('rel', 'canonical');
        document.head.appendChild(canon);
      }
      canon.setAttribute('href', url);
    }
    if (publishedTime) {
      upsertMeta(
        'meta[property="article:published_time"]',
        'article:published_time',
        'property',
        publishedTime,
      );
    }

    upsertMeta('meta[name="twitter:card"]', 'twitter:card', 'name', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'twitter:title', 'name', fullTitle);
    if (description) {
      upsertMeta('meta[name="twitter:description"]', 'twitter:description', 'name', description);
    }
    if (image) upsertMeta('meta[name="twitter:image"]', 'twitter:image', 'name', image);
  }, [title, description, image, url, type, publishedTime, siteName]);
}
