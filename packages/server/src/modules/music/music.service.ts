import { Injectable, Logger } from '@nestjs/common';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  src: string;
  cover?: string;
  lyric?: string;
}

/**
 * 汽水音乐代理服务。
 *
 * 汽水音乐没有官方公开 API，这里通过环境变量配置一个第三方「解析」服务做服务端转发，
 * 避免把密钥暴露在前端，同时由后端统一做字段归一化。
 *
 * 环境变量：
 * - QISHUI_MUSIC_API  解析接口地址（默认 https://apicx.asia/api/qishuimusic）
 * - QISHUI_MUSIC_TOKEN 解析服务令牌（放在 Authorization 请求头）
 */
@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);
  private readonly apiBase =
    process.env.QISHUI_MUSIC_API ?? 'https://apicx.asia/api/qishuimusic';
  private readonly token = process.env.QISHUI_MUSIC_TOKEN;

  async search(q: string, limit = 6, offset = 0): Promise<MusicTrack[]> {
    if (!this.token) {
      // 未配置令牌时返回免版权演示曲，便于本地开发与功能验证；
      // 配好 QISHUI_MUSIC_TOKEN 后会自动切换为真实汽水音乐解析。
      return this.buildDemoTracks(q, limit);
    }

    const tracks: MusicTrack[] = [];
    for (let i = 1; i <= limit; i++) {
      const n = i + offset;
      try {
        const url = `${this.apiBase}?msg=${encodeURIComponent(q)}&n=${n}`;
        const res = await fetch(url, {
          headers: { Authorization: this.token },
        });
        if (!res.ok) continue;
        const json: any = await res.json();
        const d = json?.data;
        if (!d?.play_url) continue;
        tracks.push({
          id: String(d.song_id ?? `${q}-${n}`),
          title: String(d.name ?? '未知歌曲'),
          artist: String(d.artist ?? '未知歌手'),
          src: String(d.play_url),
          cover: d.cover ? String(d.cover) : undefined,
          lyric: d.lyrics?.formatted ? String(d.lyrics.formatted) : undefined,
        });
      } catch (err) {
        this.logger.warn(
          `汽水音乐解析失败（${q} #${n}）: ${(err as Error).message}`,
        );
      }
    }
    return tracks;
  }

  /**
   * 未配置令牌时使用的免版权演示曲（SoundHelix 提供的免费示例音频）。
   * 仅用于本地开发与功能验证，不代表任何特定歌曲的真实资源。
   */
  private buildDemoTracks(q: string, limit: number): MusicTrack[] {
    const count = Math.min(Math.max(limit, 1), 20);
    const tracks: MusicTrack[] = [];
    for (let i = 1; i <= count; i++) {
      tracks.push({
        id: `demo-${i}`,
        title: `${q || '演示'} - 示例曲目 ${i}`,
        artist: 'Demo Artist',
        src: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${i}.mp3`,
        cover: undefined,
        lyric: undefined,
      });
    }
    return tracks;
  }
}
