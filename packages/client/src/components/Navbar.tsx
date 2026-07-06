import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../i18n/context';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationBell } from './NotificationBell';
import { ConfirmDialog } from './ConfirmDialog';
import { Menu, X, PenSquare, User, MessageSquare } from 'lucide-react';

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
      <nav className="sticky top-0 z-50 border-b border-neutral-100 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-neutral-900 hover:text-brand-600 transition-colors"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white text-sm font-bold">
                B
              </span>
              <span className="hidden sm:inline">My Blog</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
              >
                {t('nav.home')}
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/admin/posts/new"
                    className="rounded-lg px-3.5 py-2 text-sm font-medium text-neutral-600 hover:text-brand-600 hover:bg-brand-50 transition-colors flex items-center gap-1.5"
                  >
                    <PenSquare className="h-4 w-4" />
                    {t('nav.write')}
                  </Link>
                  <Link
                    to="/chat"
                    className="rounded-lg px-3.5 py-2 text-sm font-medium text-neutral-600 hover:text-brand-600 hover:bg-brand-50 transition-colors flex items-center gap-1.5"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {t('chat.title')}
                  </Link>
                  <Link
                    to="/admin/posts"
                    className="rounded-lg px-3.5 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <div className="ml-2 flex items-center gap-1 pl-2 border-l border-neutral-200">
                    <LanguageSwitcher />
                    <NotificationBell />
                    <Link
                      to="/profile"
                      className="rounded-lg p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                      title={t('nav.profile')}
                    >
                      <User className="h-4 w-4" />
                    </Link>
                    <span className="text-sm text-neutral-600">{user?.username}</span>
                    <button
                      onClick={() => setLogoutDialogOpen(true)}
                      className="rounded-lg px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      {t('nav.signOut')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <LanguageSwitcher />
                  <Link
                    to="/login"
                    className="rounded-lg px-3.5 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
                  >
                    {t('nav.signIn')}
                  </Link>
                  <Link
                    to="/register"
                    className="ml-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
                  >
                    {t('nav.getStarted')}
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-neutral-100 bg-white animate-in slide-in-from-top-2 duration-200">
            <div className="container mx-auto px-4 py-3 space-y-1">
              <Link
                to="/"
                onClick={closeMobile}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {t('nav.home')}
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/admin/posts/new"
                    onClick={closeMobile}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
                  >
                    ✍️ {t('nav.write')}
                  </Link>
                  <Link
                    to="/chat"
                    onClick={closeMobile}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
                  >
                    💬 {t('chat.title')}
                  </Link>
                  <Link
                    to="/admin/posts"
                    onClick={closeMobile}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <Link
                    to="/notifications"
                    onClick={closeMobile}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    🔔 {t('notifications.title')}
                  </Link>
                  <Link
                    to="/profile"
                    onClick={closeMobile}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    👤 {t('nav.profile')}
                  </Link>
                  <div className="border-t border-neutral-100 pt-2 mt-2">
                    <div className="px-3 py-1.5 text-xs text-neutral-400">
                      {t('nav.signedInAs')}{' '}
                      <span className="font-medium text-neutral-600">{user?.username}</span>
                    </div>
                    <div className="flex items-center justify-between px-3">
                      <button
                        onClick={() => {
                          setLogoutDialogOpen(true);
                          closeMobile();
                        }}
                        className="rounded-lg py-2 text-sm text-neutral-600 hover:text-neutral-700 cursor-pointer"
                      >
                        {t('nav.signOut')}
                      </button>
                      <LanguageSwitcher />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between px-3">
                    <Link
                      to="/login"
                      onClick={closeMobile}
                      className="rounded-lg py-2 text-sm font-medium text-neutral-700"
                    >
                      {t('nav.signIn')}
                    </Link>
                    <LanguageSwitcher />
                  </div>
                  <Link
                    to="/register"
                    onClick={closeMobile}
                    className="block rounded-lg bg-neutral-900 px-3 py-2.5 text-sm font-medium text-white text-center hover:bg-neutral-800"
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
