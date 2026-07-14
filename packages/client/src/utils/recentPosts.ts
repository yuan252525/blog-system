// 最近阅读：本地存储最近浏览的文章，用于首页「继续阅读」

export interface RecentPost {
  slug: string;
  title: string;
  coverImage?: string;
  author?: string;
  viewedAt: number;
}

const KEY = 'blog-recent-posts';
const MAX = 8;

export function getRecentPosts(): RecentPost[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentPost[]) : [];
  } catch {
    return [];
  }
}

export function addRecentPost(post: RecentPost): void {
  const next = [post, ...getRecentPosts().filter((p) => p.slug !== post.slug)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* 忽略写入失败（如隐私模式） */
  }
  window.dispatchEvent(new CustomEvent('blog:recent-updated'));
}
