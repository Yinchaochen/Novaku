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

// Counts sign-ins. A sign-out that is still talking to the server when the
// next sign-in lands must not delete the tokens that sign-in just wrote.
let sessionEpoch = 0;

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
    sessionEpoch += 1;
    await secureStore.setItemAsync('access_token', access);
    await secureStore.setItemAsync('refresh_token', refresh);
  },

  logout: async () => {
    // Signed out on screen before anything is awaited. The caller has already
    // navigated to the sign-in screen, and the root guard reads a signed-in
    // store there as "just signed in" and sends the user to the Plaza — where
    // they used to sit for as long as the two server calls below took.
    const epoch = sessionEpoch;
    set({ user: null, isAuthenticated: false });
    try {
      // Drop this device's push token first — needs the access token still
      // present to authenticate the DELETE. Best-effort.
      const { unregisterPushTokenAsync } = await import('../lib/push');
      await unregisterPushTokenAsync();
    } catch {
      // ignore — server prunes dead tokens on send
    }
    try {
      // Read after the call above, which can rotate it — and not at all once
      // a new sign-in owns the slot.
      const refreshToken =
        epoch === sessionEpoch ? await secureStore.getItemAsync('refresh_token') : null;
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
    if (epoch !== sessionEpoch) return;
    await secureStore.deleteItemAsync('access_token');
    await secureStore.deleteItemAsync('refresh_token');
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
