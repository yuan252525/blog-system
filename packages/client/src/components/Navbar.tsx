import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../i18n/context';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { ConfirmDialog } from './ConfirmDialog';
import { Menu, X, PenSquare, User, MessageSquare, Bell } from 'lucide-react';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleLogoutConfirm = () => {
    logout();
    localStorage.removeItem('access_token');
    setMobileOpen(false);
    navigate('/');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link
              to="/"
              className="group flex items-center gap-2.5 font-bold tracking-tight transition-opacity hover:opacity-80"
            >
              <span className="grid h-8 w-8 place-items-center rounded bg-brand-600 text-sm font-extrabold text-white">
                B
              </span>
              <span className="hidden font-serif text-xl font-extrabold tracking-tight text-neutral-900 sm:inline">
                My Blog<span className="text-brand-600">.</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden items-center gap-1 md:flex">
              <Link
                to="/"
                className="rounded-md px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
              >
                {t('nav.home')}
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/admin/posts/new"
                    className="flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-brand-50 hover:text-brand-600"
                  >
                    <PenSquare className="h-4 w-4" />
                    {t('nav.write')}
                  </Link>
                  <Link
                    to="/chat"
                    className="flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-brand-50 hover:text-brand-600"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {t('chat.title')}
                  </Link>
                  <Link
                    to="/admin/posts"
                    className="rounded-md px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <div className="ml-2 flex items-center gap-1 border-l border-line pl-2">
                    <LanguageSwitcher />
                    <ThemeToggle />
                    <NotificationBell />
                    <Link
                      to="/profile"
                      className="rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                      title={t('nav.profile')}
                    >
                      <User className="h-4 w-4" />
                    </Link>
                    <span className="text-sm text-neutral-600">{user?.username}</span>
                    <button
                      onClick={() => setLogoutDialogOpen(true)}
                      className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                    >
                      {t('nav.signOut')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <LanguageSwitcher />
                  <ThemeToggle />
                  <Link
                    to="/login"
                    className="rounded-md px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                  >
                    {t('nav.signIn')}
                  </Link>
                  <Link
                    to="/register"
                    className="ml-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                  >
                    {t('nav.getStarted')}
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="cursor-pointer rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100 md:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="animate-in slide-in-from-top-2 border-t border-line bg-surface duration-200 md:hidden">
            <div className="container mx-auto space-y-1 px-4 py-3">
              <Link
                to="/"
                onClick={closeMobile}
                className="block rounded-md px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {t('nav.home')}
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/admin/posts/new"
                    onClick={closeMobile}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
                  >
                    <PenSquare className="h-4 w-4" />
                    {t('nav.write')}
                  </Link>
                  <Link
                    to="/chat"
                    onClick={closeMobile}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {t('chat.title')}
                  </Link>
                  <Link
                    to="/admin/posts"
                    onClick={closeMobile}
                    className="block rounded-md px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <Link
                    to="/notifications"
                    onClick={closeMobile}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <Bell className="h-4 w-4" />
                    {t('notifications.title')}
                  </Link>
                  <Link
                    to="/profile"
                    onClick={closeMobile}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <User className="h-4 w-4" />
                    {t('nav.profile')}
                  </Link>
                  <div className="flex items-center justify-between border-t border-line pt-2 mt-2">
                    <button
                      onClick={() => {
                        setLogoutDialogOpen(true);
                        closeMobile();
                      }}
                      className="cursor-pointer rounded-md py-2 text-sm text-neutral-600 hover:text-neutral-700"
                    >
                      {t('nav.signOut')}
                    </button>
                    <div className="flex items-center gap-1">
                      <LanguageSwitcher />
                      <ThemeToggle />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between px-3">
                    <Link
                      to="/login"
                      onClick={closeMobile}
                      className="rounded-md py-2 text-sm font-medium text-neutral-700"
                    >
                      {t('nav.signIn')}
                    </Link>
                    <div className="flex items-center gap-1">
                      <LanguageSwitcher />
                      <ThemeToggle />
                    </div>
                  </div>
                  <Link
                    to="/register"
                    onClick={closeMobile}
                    className="block rounded-md bg-neutral-900 px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-neutral-800"
                  >
                    {t('nav.getStarted')}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <ConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        title={t('logout.title')}
        description={t('logout.description')}
        confirmText={t('logout.confirm')}
        cancelText={t('logout.cancel')}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
}
