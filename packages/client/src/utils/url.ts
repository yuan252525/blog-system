/**
 * 把资源 URL 解析为浏览器可加载的完整地址。
 *
 * 后端存储的是相对路径（如 /api/v1/uploads/<id>/file），
 * 需要根据前端已知的 API 地址（VITE_API_BASE_URL）补全协议与主机，
 * 这样在本地、Docker、域名反代、局域网等不同访问方式下都能正确加载。
 * 若已经是绝对地址（历史数据），则原样返回。
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export function resolveAssetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  try {
    return new URL(url, API_BASE).toString();
  } catch {
    return url;
  }
}
