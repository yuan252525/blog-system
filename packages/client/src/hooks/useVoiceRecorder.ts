import { useRef, useState, useCallback, useEffect } from 'react';

export interface VoiceRecordingResult {
  blob: Blob;
  mimeType: string;
  duration: number;
  transcript: string;
}

interface UseVoiceRecorder {
  recording: boolean;
  elapsed: number; // seconds
  transcript: string;
  micSupported: boolean;
  speechSupported: boolean;
  start: () => Promise<void>;
  /** 停止录音并返回录音结果（含转写文本） */
  stop: () => Promise<VoiceRecordingResult | null>;
  /** 取消录音，丢弃结果 */
  cancel: () => void;
}

export function useVoiceRecorder(): UseVoiceRecorder {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [micSupported, setMicSupported] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const lastResultRef = useRef<VoiceRecordingResult | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasMedia = !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    );
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setMicSupported(hasMedia);
    setSpeechSupported(!!SpeechRecognitionCtor);
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      recognitionRef.current?.stop?.();
    };
  }, []);

  const start = useCallback(async () => {
    if (!micSupported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      transcriptRef.current = '';
      setTranscript('');
      setElapsed(0);

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start();
      setRecording(true);

      // 计时
      const startTs = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTs) / 1000));
      }, 200);

      // 实时语音转文字
      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionCtor) {
        try {
          const rec: any = new SpeechRecognitionCtor();
          rec.lang = 'zh-CN';
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (event: any) => {
            let text = '';
            for (let i = 0; i < event.results.length; i++) {
              text += event.results[i][0].transcript;
            }
            transcriptRef.current = text;
            setTranscript(text);
          };
          rec.onerror = () => {
            /* 忽略识别错误，不影响录音 */
          };
          rec.start();
          recognitionRef.current = rec;
        } catch {
          /* 转写不可用则跳过 */
        }
      }
    } catch (err) {
      console.error('语音录制启动失败:', err);
      setRecording(false);
    }
  }, [micSupported]);

  const stop = useCallback((): Promise<VoiceRecordingResult | null> => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') return Promise.resolve(null);

    return new Promise<VoiceRecordingResult | null>((resolve) => {
      mr.onstop = () => {
        const type = mr.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const url = URL.createObjectURL(blob);
        const audioEl = document.createElement('audio');
        audioEl.preload = 'metadata';

        const finish = (duration: number) => {
          URL.revokeObjectURL(url);
          const result: VoiceRecordingResult = {
            blob,
            mimeType: type,
            duration,
            transcript: transcriptRef.current,
          };
          lastResultRef.current = result;
          resolve(result);
        };

        audioEl.onloadedmetadata = () => finish(audioEl.duration || 0);
        audioEl.onerror = () => finish(0);
        audioEl.src = url;

        recognitionRef.current?.stop?.();
        recognitionRef.current = null;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setRecording(false);
      };
      mr.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.onstop = null;
      mr.stop();
    }
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    lastResultRef.current = null;
    transcriptRef.current = '';
    setRecording(false);
    setTranscript('');
    setElapsed(0);
  }, []);

  return { recording, elapsed, transcript, micSupported, speechSupported, start, stop, cancel };
}
