import { create } from 'zustand';
import * as secureStore from '../lib/secureStore';

interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  locale: string;
  identity: 'newcomer' | 'resident' | 'traveler';
  city: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  setTokens: (access: string, refresh: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

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
    const token = await secureStore.getItemAsync('access_token');
    if (!token) return false;
    try {
      const { api } = await import('../lib/api');
      const res = await api.get('/auth/me');
      const user = res.data.data as User;
      set({ user, isAuthenticated: true });
      return true;
    } catch {
      await secureStore.deleteItemAsync('access_token');
      await secureStore.deleteItemAsync('refresh_token');
      return false;
    }
  },
}));
