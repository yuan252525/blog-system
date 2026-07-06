import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';

export function useAuth() {
  const { user, isAuthenticated, setAuth, logout } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && !user) {
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
