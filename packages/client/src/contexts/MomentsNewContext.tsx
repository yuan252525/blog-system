import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { momentsApi } from '../api/moments';
import { useAuthStore } from '../stores/authStore';

const LAST_SEEN_KEY = 'moments_last_seen';

// 轮询间隔：每 60s 检测一次自上次查看以来的新朋友圈（类似微信红点）。
// 如需调整轮询频率，改这里即可。
const POLL_INTERVAL = 60_000;

interface MomentsNewContextValue {
  hasNew: boolean;
  markSeen: () => void;
}

const MomentsNewContext = createContext<MomentsNewContextValue>({
  hasNew: false,
  markSeen: () => {},
});

export function MomentsNewProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuthStore();
  const [hasNew, setHasNew] = useState(false);
  // 上次查看朋友圈的时间，持久化到 localStorage，跨会话保留
  const lastSeenRef = useRef<string>(
    localStorage.getItem(LAST_SEEN_KEY) ?? new Date(0).toISOString(),
  );

  const markSeen = useCallback(() => {
    const now = new Date().toISOString();
    lastSeenRef.current = now;
    localStorage.setItem(LAST_SEEN_KEY, now);
    setHasNew(false);
  }, []);

  useEffect(() => {
    const token = accessToken || localStorage.getItem('access_token');
    if (!token) return; // 未登录不轮询
    let cancelled = false;
    const check = async () => {
      try {
        const res = await momentsApi.hasNew(lastSeenRef.current);
        if (!cancelled && res.hasNew) setHasNew(true);
      } catch {
        // 轮询失败静默忽略，下一轮继续
      }
    };
    check();
    const timer = setInterval(check, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [accessToken]);

  return (
    <MomentsNewContext.Provider value={{ hasNew, markSeen }}>
      {children}
    </MomentsNewContext.Provider>
  );
}

export function useMomentsNew() {
  return useContext(MomentsNewContext);
}
