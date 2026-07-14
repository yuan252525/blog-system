import apiClient from './client';
import type { Track } from '../utils/musicSource';

export const musicApi = {
  /** 通过后端代理搜索汽水音乐，返回可播放曲目列表 */
  search: (q: string, limit = 8) =>
    apiClient.get<unknown, Track[]>('/music/search', { params: { q, limit } }),
};
