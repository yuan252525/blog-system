import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { I18nProvider } from './i18n/context';
import { NotificationProvider } from './contexts/NotificationContext';
import { MomentsNewProvider } from './contexts/MomentsNewContext';
import { MainLayout } from './layouts/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PostDetailPage } from './pages/posts/PostDetailPage';
import { CategoryPage } from './pages/posts/CategoryPage';
import { ArchivePage } from './pages/ArchivePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { EditProfilePage } from './pages/EditProfilePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { AdminPostsPage } from './pages/admin/AdminPostsPage';
import { CreatePostPage } from './pages/admin/CreatePostPage';
import { EditPostPage } from './pages/admin/EditPostPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminCommentsPage } from './pages/admin/AdminCommentsPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminTagsPage } from './pages/admin/AdminTagsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminLayout } from './components/AdminLayout';
import { AdminRoute } from './components/AdminRoute';
import { ChatPage } from './pages/ChatPage';
import { MomentsPage } from './pages/MomentsPage';
import { WorldPage } from './pages/WorldPage';

function App() {
  return (
    <I18nProvider>
      <HashRouter>
        <NotificationProvider>
          <MomentsNewProvider>
          <Routes>
            <Route element={<MainLayout />}>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/posts/:slug" element={<PostDetailPage />} />
              <Route path="/categories/:slug" element={<CategoryPage />} />
              <Route path="/archive" element={<ArchivePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes（普通登录用户） */}
              <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/edit" element={<EditProfilePage />} />
              <Route path="/user/:username" element={<UserProfilePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/chat" element={<ChatPage />} />
              <Route path="/moments" element={<MomentsPage />} />
              <Route path="/world" element={<WorldPage />} />
              </Route>

              {/* 后台管理：整棵子树仅管理员可访问 */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="posts" replace />} />
                  <Route path="posts" element={<AdminPostsPage />} />
                  <Route path="posts/new" element={<CreatePostPage />} />
                  <Route path="posts/:id/edit" element={<EditPostPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="comments" element={<AdminCommentsPage />} />
                  <Route path="categories" element={<AdminCategoriesPage />} />
                  <Route path="tags" element={<AdminTagsPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
          </MomentsNewProvider>
        </NotificationProvider>
      </HashRouter>
    </I18nProvider>
  );
}

export default App;
