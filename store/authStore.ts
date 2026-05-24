import { AxiosError } from 'axios';
import { create } from 'zustand';

import type { AuthUser } from '../features/auth/useAuth';
import { addSentryBreadcrumb, reportToSentry } from '../lib/sentry';
import * as secureStore from '../lib/secureStore';

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
  markHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  hasHydrated: false,

  setUser: (user) => {
    set({ user, isAuthenticated: true });
  },

  markHydrated: () => {
    set({ hasHydrated: true });
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
    } catch (err) {
      // P1.9 (audit FE-CRIT-2): server-side logout failure means the refresh
      // token is never revoked server-side. Another device or copy of the
      // refresh token stays alive — a security/audit hole. Always capture.
      // (Axios interceptor already captures 5xx; this also catches non-Axios
      // errors like SecureStore failures.)
      reportToSentry(err, { source: 'authStore.logout' });
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
      } catch (err) {
        // P1.9 (audit FE-CRIT-1): hydrate() on cold start swallowed every
        // /auth/me failure and force-logged out the user with no signal.
        // Distinguish 401 (real session expiry — common, silent) from 5xx /
        // network / non-Axios errors (transient or genuinely broken).
        const status = err instanceof AxiosError ? err.response?.status : undefined;
        if (status === 401) {
          // Expected: token expired or revoked. Leave a breadcrumb so we have
          // context if a downstream event fires; don't capture.
          addSentryBreadcrumb('auth.hydrate.expired_session', { status: 401 });
        } else {
          // Network down, backend 5xx, SecureStore weirdness — user gets
          // force-logged-out for a reason that isn't "their session expired".
          reportToSentry(err, { source: 'authStore.hydrate', status });
        }
        await secureStore.deleteItemAsync('access_token');
        await secureStore.deleteItemAsync('refresh_token');
        return false;
      }
    } finally {
      set({ hasHydrated: true });
    }
  },
}));
