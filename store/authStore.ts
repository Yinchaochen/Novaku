import { create } from 'zustand';
import * as secureStore from '../lib/secureStore';
import type { AuthUser } from '../features/auth/useAuth';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** Flips true once the cold-start hydrate finishes (success OR failure).
   *  Welcome screen waits on this before starting its 1-second redirect
   *  timer, so we never bounce the user to /login while we're still
   *  reading their token from SecureStore. */
  hasHydrated: boolean;
  setUser: (user: AuthUser) => void;
  setTokens: (access: string, refresh: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  hasHydrated: false,

  setUser: (user) => {
    set({ user, isAuthenticated: true });
  },

  setTokens: async (access, refresh) => {
    await secureStore.setItemAsync('access_token', access);
    await secureStore.setItemAsync('refresh_token', refresh);
  },

  logout: async () => {
    try {
      const refreshToken = await secureStore.getItemAsync('refresh_token');
      if (refreshToken) {
        const { api } = await import('../lib/api');
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // best-effort: clear local state regardless
    }
    await secureStore.deleteItemAsync('access_token');
    await secureStore.deleteItemAsync('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  hydrate: async () => {
    try {
      const token = await secureStore.getItemAsync('access_token');
      if (!token) return false;
      try {
        const { api } = await import('../lib/api');
        const res = await api.get('/auth/me');
        const user = res.data.data as AuthUser;
        set({ user, isAuthenticated: true });
        return true;
      } catch {
        await secureStore.deleteItemAsync('access_token');
        await secureStore.deleteItemAsync('refresh_token');
        return false;
      }
    } finally {
      set({ hasHydrated: true });
    }
  },
}));
