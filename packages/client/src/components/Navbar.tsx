import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../i18n/context';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationBell } from './NotificationBell';
import { useMomentsNew } from '../contexts/MomentsNewContext';
import { ThemeToggle } from './ThemeToggle';
import { ConfirmDialog } from './ConfirmDialog';
import { NavbarCheckIn } from './NavbarCheckIn';
import { Trophy } from 'lucide-react';
import { Menu, X, User, Bell, Feather } from 'lucide-react';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasNew: hasNewMoments } = useMomentsNew();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  // 仅管理员可见后台入口
  const isAdmin = user?.role === 'ADMIN';

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
          <div className="flex h-16 items-center justify-between gap-2">
            {/* Logo */}
            <Link
              to="/"
              className="group flex shrink-0 items-center gap-2.5 font-bold tracking-tight transition-opacity hover:opacity-80"
            >
              <span className="grid h-8 w-8 place-items-center rounded bg-brand-600 text-white">
                <Feather className="h-4 w-4" />
              </span>
              <span className="hidden font-serif text-xl font-extrabold tracking-tight text-neutral-900 sm:inline">
                My Blog<span className="text-brand-600">.</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden min-w-0 flex-1 items-center lg:flex">
              {/* 主链接区：不够宽时横向滚动，绝不挤压 logo 与右侧操作区 */}
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Link
                  to="/"
                  className="shrink-0 rounded-md px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                >
                  {t('nav.home')}
                </Link>

                {isAuthenticated ? (
                  <>
                    {isAdmin && (
                      <Link
                        to="/admin/posts/new"
                        className="flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-brand-50 hover:text-brand-600"
                      >
                        {t('nav.write')}
                      </Link>
                    )}
                    <Link
                      to="/chat"
                      className="flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-brand-50 hover:text-brand-600"
                    >
                      {t('chat.title')}
                    </Link>
                    <Link
                      to="/moments"
                      className="flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-brand-50 hover:text-brand-600"
                    >
                      <span className="relative inline-flex">
                        {t('nav.moments')}
                        {hasNewMoments && (
                          <span className="absolute -right-2 -top-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface" />
                        )}
                      </span>
                    </Link>
                    <Link
                      to="/world"
                      className="flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-brand-50 hover:text-brand-600"
                    >
                      {t('nav.world')}
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin/posts"
                        className="shrink-0 rounded-md px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                      >
                        {t('nav.dashboard')}
                      </Link>
                    )}
                  </>
                ) : null}
              </div>

              {/* 右侧操作区：始终固定显示，含退出登录，不被滚动影响 */}
              <div className="flex shrink-0 items-center gap-1 whitespace-nowrap border-l border-line pl-2">
                {isAuthenticated ? (
                  <>
                    <NavbarCheckIn />
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
                    <Link
                      to="/leaderboard"
                      className="rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                      title={t('gamification.leaderboard')}
                    >
                      <Trophy className="h-4 w-4" />
                    </Link>
                    <span className="hidden shrink-0 text-sm text-neutral-600 xl:inline">{user?.username}</span>
                    <button
                      onClick={() => setLogoutDialogOpen(true)}
                      className="shrink-0 cursor-pointer rounded-md px-3 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                    >
                      {t('nav.signOut')}
                    </button>
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
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="cursor-pointer rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100 lg:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="animate-in slide-in-from-top-2 border-t border-line bg-surface duration-200 lg:hidden">
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
                  {isAdmin && (
                    <Link
                      to="/admin/posts/new"
                      onClick={closeMobile}
                      className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
                    >
                      {t('nav.write')}
                    </Link>
                  )}
                  <div onClick={closeMobile} className="overflow-x-auto">
                    <NavbarCheckIn />
                  </div>
                  <Link
                    to="/chat"
                    onClick={closeMobile}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
                  >
                    {t('chat.title')}
                  </Link>
                  <Link
                    to="/moments"
                    onClick={closeMobile}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
                  >
                    <span className="relative inline-flex">
                      {t('nav.moments')}
                      {hasNewMoments && (
                        <span className="absolute -right-2 -top-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface" />
                      )}
                    </span>
                  </Link>
                  <Link
                    to="/world"
                    onClick={closeMobile}
                    className="block rounded-md px-3 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
                  >
                    {t('nav.world')}
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin/posts"
                      onClick={closeMobile}
                      className="block rounded-md px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      {t('nav.dashboard')}
                    </Link>
                  )}
                  <Link
                    to="/leaderboard"
                    onClick={closeMobile}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <Trophy className="h-4 w-4" />
                    {t('gamification.leaderboard')}
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
