import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export function MainLayout() {
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';

  return (
    <div className={`flex flex-col ${isChatPage ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <Navbar />
      <main className={`${isChatPage ? 'flex-1 min-h-0' : 'flex-1 page-enter'}`}>
        <Outlet />
      </main>
      {!isChatPage && (
        <footer className="mt-20 border-t border-line bg-surface py-10">
          <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row">
            <span className="font-serif text-lg font-extrabold tracking-tight text-neutral-900">
              My Blog<span className="text-brand-600">.</span>
            </span>
            <span className="font-mono text-xs tracking-wide text-neutral-400">
              © {new Date().getFullYear()} MY BLOG — ALL RIGHTS RESERVED
            </span>
            <span className="font-mono text-xs tracking-wide text-neutral-400">REMOTE / GLOBAL</span>
          </div>
        </footer>
      )}
    </div>
  );
}
