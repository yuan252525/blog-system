import { Outlet, useLocation, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { BackToTop } from '../components/BackToTop';
import { OfflineBanner } from '../components/OfflineBanner';
import { MusicPlayer } from '../components/MusicPlayer';
import { useTranslation } from '../i18n/context';
import { API_BASE } from '../utils/url';

export function MainLayout() {
  const location = useLocation();
  const { t } = useTranslation();
  const isImmersive = location.pathname === '/chat' || location.pathname === '/world';

  return (
    <div className={`flex flex-col ${isImmersive ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <Navbar />
      <OfflineBanner />
      <main className={`${isImmersive ? 'flex-1 min-h-0' : 'flex-1 page-enter'}`}>
        <Outlet />
      </main>
      {!isImmersive && (
        <MusicPlayer />
      )}
      {!isImmersive && (
        <footer className="mt-20 border-t border-line bg-surface py-10">
          <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
            <span className="font-serif text-lg font-extrabold tracking-tight text-neutral-900">
              My Blog<span className="text-brand-600">.</span>
            </span>
            <div className="flex items-center gap-4 text-xs text-neutral-400">
              <Link to="/archive" className="hover:text-neutral-700 transition-colors">
                {t('archive.title')}
              </Link>
              <a
                href={`${API_BASE}/feeds/rss`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-neutral-700 transition-colors"
              >
                {t('footer.rss')}
              </a>
              <a
                href={`${API_BASE}/feeds/sitemap`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-neutral-700 transition-colors"
              >
                {t('footer.sitemap')}
              </a>
            </div>
            <span className="font-mono text-xs tracking-wide text-neutral-400">
              © {new Date().getFullYear()} MY BLOG
            </span>
          </div>
        </footer>
      )}
      <BackToTop />
    </div>
  );
}
