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
        <footer className="border-t border-neutral-100 bg-white py-8 mt-16">
          <div className="container mx-auto max-w-6xl px-4 text-center text-sm text-neutral-400">
            <p>&copy; {new Date().getFullYear()} My Blog. All rights reserved.</p>
          </div>
        </footer>
      )}
    </div>
  );
}
