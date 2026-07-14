import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';

export function useAuth() {
  const { user, isAuthenticated, setAuth, logout } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    // 已登录但缺少 role（旧缓存或首次进入）时重新拉取 profile
    if (token && (!user || !user.role)) {
      authApi
        .getProfile()
        .then((profile) => {
          useAuthStore.getState().setAuth(token, profile);
        })
        .catch(() => {
          logout();
        });
    }
  }, [user, logout]);

  return { user, isAuthenticated, setAuth, logout };
}
