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
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { EditProfilePage } from './pages/EditProfilePage';
import { AdminPostsPage } from './pages/admin/AdminPostsPage';
import { CreatePostPage } from './pages/admin/CreatePostPage';
import { EditPostPage } from './pages/admin/EditPostPage';
import { ChatPage } from './pages/ChatPage';
import { MomentsPage } from './pages/MomentsPage';

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
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/admin" element={<Navigate to="/admin/posts" replace />} />
                <Route path="/admin/posts" element={<AdminPostsPage />} />
                <Route path="/admin/posts/new" element={<CreatePostPage />} />
                <Route path="/admin/posts/:id/edit" element={<EditPostPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/edit" element={<EditProfilePage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/chat" element={<ChatPage />} />
              <Route path="/moments" element={<MomentsPage />} />
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
