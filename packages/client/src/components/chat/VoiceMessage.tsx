import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// 全局单例：保证同一时间只有一个语音在播放。
// 任一实例开始播放时，会先暂停此前正在播放的实例。
type StopFn = () => void;
let activeStopper: StopFn | null = null;

function registerActive(stop: StopFn): void {
  if (activeStopper && activeStopper !== stop) {
    activeStopper(); // 暂停上一个正在播放的语音
  }
  activeStopper = stop;
}

function clearActive(stop: StopFn): void {
  if (activeStopper === stop) activeStopper = null;
}

interface VoiceMessageProps {
  src: string;
  isMe: boolean;
}

export function VoiceMessage({ src, isMe }: VoiceMessageProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopperRef = useRef<StopFn | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => setDuration(audio.duration || 0);
    audio.ontimeupdate = () => {
      setCurrent(audio.currentTime);
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    };
    audio.onended = () => {
      setPlaying(false);
      setProgress(0);
      setCurrent(0);
      if (stopperRef.current) clearActive(stopperRef.current);
    };

    // 注册暂停器，供单例控制
    stopperRef.current = () => {
      audio.pause();
      setPlaying(false);
      setProgress(0);
      setCurrent(0);
    };

    return () => {
      audio.pause();
      if (stopperRef.current) clearActive(stopperRef.current);
      audioRef.current = null;
      stopperRef.current = null;
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      if (stopperRef.current) clearActive(stopperRef.current);
    } else {
      if (stopperRef.current) registerActive(stopperRef.current);
      audio.play().catch(() => {});
      setPlaying(true);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl min-w-[200px] max-w-[260px] ${
        isMe ? 'bg-brand-600 text-white rounded-br-md' : 'bg-neutral-100 text-neutral-800 rounded-bl-md'
      }`}
    >
      <button
        onClick={toggle}
        className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isMe ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-brand-600 text-white hover:bg-brand-700'
        }`}
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className={`h-1 rounded-full overflow-hidden ${isMe ? 'bg-white/30' : 'bg-neutral-300'}`}>
          <div
            className={`h-full transition-[width] duration-100 ${isMe ? 'bg-white' : 'bg-brand-500'}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <span className={`text-xs tabular-nums shrink-0 ${isMe ? 'text-white/80' : 'text-neutral-500'}`}>
        {formatTime(current || duration)}
      </span>
    </div>
  );
}
