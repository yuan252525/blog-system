import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from '../i18n/context';
import { FileText, Users, MessageSquare, FolderTree, Tags, Settings, Shield } from 'lucide-react';

const navItems = [
  { to: '/admin/posts', labelKey: 'admin.managePosts', icon: FileText },
  { to: '/admin/users', labelKey: 'admin.users', icon: Users },
  { to: '/admin/comments', labelKey: 'admin.comments', icon: MessageSquare },
  { to: '/admin/categories', labelKey: 'admin.categories', icon: FolderTree },
  { to: '/admin/tags', labelKey: 'admin.tags', icon: Tags },
  { to: '/admin/settings', labelKey: 'admin.settings', icon: Settings },
];

export function AdminLayout() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-10">
      <div className="mb-8 flex items-center gap-2">
        <Shield className="h-5 w-5 text-brand-600" />
        <h1 className="text-2xl font-bold text-neutral-900">{t('admin.panel' as Parameters<typeof t>[0])}</h1>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Sidebar */}
        <aside className="md:w-56 md:shrink-0">
          <nav className="flex gap-1 overflow-x-auto md:flex-col md:gap-1 md:overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {t(item.labelKey as Parameters<typeof t>[0])}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
