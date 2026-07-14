export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  cover?: string;
}

/**
 * 默认播放列表：使用 SoundHelix 提供的免版权演示曲目，开箱即用、无跨域问题。
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 关于「汽水音乐」音源                                                      │
 * │ 汽水音乐（抖音旗下）并没有面向第三方的官方公开播放 API。网络上流传的「解析」 │
 * │ 接口均为非官方实现，存在版权风险、稳定性差（随时失效）、通常需要自建代理 +  │
 * │ API 密钥，且直接在前端调用会有密钥泄露与跨域问题。                        │
 * │                                                                           │
 * │ 如果你已自行搭建了汽水音乐解析代理（推荐放在后端，避免密钥暴露），只需把   │
 * │ 下面的 getDefaultPlaylist() 改为请求你自己的后端代理即可，例如：          │
 * │                                                                           │
 * │   export async function fetchPlaylist(): Promise<Track[]> {               │
 * │     const res = await fetch('/api/music/qishui?keyword=...');             │
 * │     return res.json();                                                    │
 * │   }                                                                       │
 * │                                                                           │
 * │ 注意：不要把第三方解析密钥写进前端代码。                                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export function getDefaultPlaylist(): Track[] {
  return Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    return {
      id: `sh-${n}`,
      title: `SoundHelix Song ${n}`,
      artist: 'T. Schürger',
      src: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`,
    };
  });
}
