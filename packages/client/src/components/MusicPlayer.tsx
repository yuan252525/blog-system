import { useCallback, useEffect, useRef, useState } from 'react';
import { getDefaultPlaylist, type Track } from '../utils/musicSource';
import { musicApi } from '../api/music';
import { useTranslation } from '../i18n/context';
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  GripHorizontal,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';

const POS_KEY = 'music-player-pos';

function loadPos(): { x: number; y: number } {
  try {
    const saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved;
  } catch {
    /* ignore */
  }
  return {
    x: Math.max(12, window.innerWidth - 320),
    y: Math.max(80, window.innerHeight - 280),
  };
}

export function MusicPlayer() {
  const { t } = useTranslation();
  const [tracks, setTracks] = useState<Track[]>(getDefaultPlaylist());
  const audioRef = useRef<HTMLAudioElement>(null);

  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [pos, setPos] = useState<{ x: number; y: number }>(loadPos);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const track: Track = tracks[index];

  // 将位置约束在视口内，避免被浏览器边缘/地址栏遮挡或拖出屏幕
  const clampPos = useCallback((x: number, y: number) => {
    const el = boxRef.current;
    const w = el?.offsetWidth ?? 288;
    const h = el?.offsetHeight ?? 200;
    const maxX = Math.max(0, window.innerWidth - w);
    const maxY = Math.max(0, window.innerHeight - h);
    return {
      x: Math.min(Math.max(0, x), maxX),
      y: Math.min(Math.max(0, y), maxY),
    };
  }, []);

  // 通过后端代理搜索汽水音乐
  const onSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (!q || searching) return;
      setSearching(true);
      musicApi
        .search(q, 8)
        .then((res) => {
          if (res.length) {
            setTracks(res);
            setIndex(0);
            // 浏览器自动播放策略：用户主动搜索属于用户手势，可尝试播放
            setIsPlaying(true);
          }
        })
        .catch(() => {
          /* 失败时保持当前列表（默认演示曲） */
        })
        .finally(() => setSearching(false));
    },
    [query, searching],
  );

  // 持久化位置
  useEffect(() => {
    localStorage.setItem(POS_KEY, JSON.stringify(pos));
  }, [pos]);

  // 窗口尺寸变化时重新约束位置，避免被遮挡或移出视口
  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p.x, p.y));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampPos]);

  // 同步音量
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // 切换曲目后若处于播放态则自动续播
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [index, isPlaying]);

  const play = useCallback(() => {
    audioRef.current
      ?.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  const next = useCallback(() => setIndex((i) => (i + 1) % tracks.length), [tracks.length]);
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + tracks.length) % tracks.length),
    [tracks.length],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPos(clampPos(e.clientX - drag.current.dx, e.clientY - drag.current.dy));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    drag.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (audioRef.current && duration) audioRef.current.currentTime = ratio * duration;
  };

  const fmt = (s: number) => {
    if (!Number.isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <div
      ref={boxRef}
      className="no-print fixed z-[60] w-72 select-none rounded-2xl border border-neutral-200 bg-white/95 shadow-xl backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95"
      style={{ left: pos.x, top: pos.y }}
    >
      <audio
        ref={audioRef}
        src={track.src}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={next}
      />

      {/* 拖拽标题栏 */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex cursor-grab items-center gap-2 rounded-t-2xl border-b border-neutral-100 px-3 py-2 active:cursor-grabbing dark:border-neutral-800"
      >
        <GripHorizontal className="h-4 w-4 shrink-0 text-neutral-400" />
        <Music className="h-4 w-4 shrink-0 text-brand-500" />
        <span className="flex-1 truncate text-xs font-semibold text-neutral-700 dark:text-neutral-200">
          {t('music.title')}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? t('music.expand') : t('music.collapse')}
          className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
        >
          {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label={t('music.close')}
          className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-3 p-3">
          {/* 曲目信息 */}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {track.title}
            </p>
            <p className="truncate text-xs text-neutral-400">{track.artist}</p>
          </div>

          {/* 进度条 */}
          <div>
            <div
              onClick={seek}
              className="group h-1.5 w-full cursor-pointer rounded-full bg-neutral-200 dark:bg-neutral-700"
            >
              <div
                className="h-full rounded-full bg-brand-600 transition-[width]"
                style={{ width: duration ? `${(current / duration) * 100}%` : '0%' }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
              <span>{fmt(current)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prev}
              aria-label={t('music.prev')}
              className="rounded-full p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-brand-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label={isPlaying ? t('music.pause') : t('music.play')}
              className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-white shadow transition-colors hover:bg-brand-700"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={next}
              aria-label={t('music.next')}
              className="rounded-full p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-brand-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* 音量 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={t('music.volume')}
              className="text-neutral-400 transition-colors hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                setMuted(false);
              }}
              className="h-1 flex-1 cursor-pointer accent-brand-600"
              aria-label={t('music.volume')}
            />
          </div>

          {/* 汽水音乐搜索 */}
          <form onSubmit={onSearch} className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('music.searchPlaceholder')}
                className="w-full rounded-full border border-neutral-200 bg-transparent py-1.5 pl-7 pr-2 text-xs text-neutral-700 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-400 dark:border-neutral-700 dark:text-neutral-200"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="shrink-0 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {searching ? t('music.searching') : t('music.search')}
            </button>
          </form>

          {/* 播放列表 */}
          <div className="max-h-32 overflow-y-auto border-t border-neutral-100 pt-2 dark:border-neutral-800">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
              {t('music.playlist')}
            </p>
            <ul className="space-y-0.5">
              {tracks.map((tr, i) => (
                <li key={tr.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    className={`w-full truncate rounded px-2 py-1 text-left text-xs transition-colors ${
                      i === index
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300'
                        : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {tr.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
