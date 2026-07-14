import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from '../i18n/context';

/** 离线提示横幅：网络断开时顶部固定显示，恢复后自动消失 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="no-print fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white">
      <WifiOff className="h-3.5 w-3.5" />
      {t('offline.banner')}
    </div>
  );
}
