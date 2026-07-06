import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 page-enter">
        <Outlet />
      </main>
      <footer className="border-t border-neutral-100 bg-white py-8 mt-16">
        <div className="container mx-auto max-w-6xl px-4 text-center text-sm text-neutral-400">
          <p>&copy; {new Date().getFullYear()} My Blog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
