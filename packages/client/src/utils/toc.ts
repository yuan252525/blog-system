// 文章目录（TOC）相关工具：slug 生成、去重、从 Markdown 解析标题

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

/** 生成 URL 友好的 slug（保留中文） */
export function slugify(text: string): string {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w一-龥\s-]/g, '') // 保留字母数字、中文、空格、连字符
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** 带去重的 slug 生成器：同一文档内多次调用，重复标题自动追加序号 */
export function makeSlugger() {
  const seen = new Map<string, number>();
  return (text: string): string => {
    const base = slugify(text) || 'section';
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };
}

/** 去除 Markdown 行内语法，得到纯文本标题 */
export function stripInlineMarkdown(md: string): string {
  return md
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/** 从 Markdown 源码解析 h1~h3 标题，生成目录 */
export function buildToc(markdown: string): TocItem[] {
  const lines = markdown.split('\n');
  const slugger = makeSlugger();
  const items: TocItem[] = [];
  let inFence = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{1,3})\s+(.+?)\s*#*$/.exec(line);
    if (!match) continue;

    const level = match[1].length;
    const text = stripInlineMarkdown(match[2]);
    if (!text) continue;

    items.push({ id: slugger(text), text, level });
  }

  return items;
}
