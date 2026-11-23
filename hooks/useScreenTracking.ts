import { useGlobalSearchParams, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useConsents } from '../features/compliance/useCompliance';
import { api } from '../lib/api';
import { installedAppVersion } from '../lib/appVersion';
import { consentGranted } from '../lib/consents';
import {
  closeScreen,
  newScreenSessionId,
  type OpenScreen,
  type ScreenViewItem,
  screenFromSegments,
} from '../lib/screenTracking';
import { useAuthStore } from '../store/authStore';

const BATCH = 10;

// How long each screen stays open (D-200), sent in batches and when the app leaves the
// foreground. Only for signed-in people who switched on usage statistics; a failed send
// is dropped, never retried or queued.
export function useScreenTracking(): void {
  const segments = useSegments();
  const params = useGlobalSearchParams();
  const signedIn = useAuthStore((s) => s.isAuthenticated);
  const consents = useConsents();
  const tracking = signedIn && consentGranted(consents.data, 'cookies_analytics');
  const open = useRef<OpenScreen | null>(null);
  const route = useRef<{ screen: string; entityId: string | null } | null>(null);
  const queue = useRef<ScreenViewItem[]>([]);
  const sessionId = useRef(newScreenSessionId());
  const allowed = useRef(tracking);
  allowed.current = tracking;

  const flush = () => {
    const items = queue.current.splice(0, 50);
    if (!items.length || !allowed.current) return;
    void api
      .post('/usage/screen-views', {
        session_id: sessionId.current,
        platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
        app_version: installedAppVersion(),
        items,
      })
      .catch(() => {});
  };

  const close = () => {
    const finished = closeScreen(open.current, Date.now());
    open.current = null;
    if (finished) queue.current.push(finished);
  };

  const routeKey = `${segments.join('/')}|${typeof params.id === 'string' ? params.id : ''}`;
  useEffect(() => {
    close();
    if (!tracking) {
      queue.current = [];
      route.current = null;
      return;
    }
    route.current = screenFromSegments(segments, params);
    open.current = { ...route.current, startedAt: Date.now() };
    if (queue.current.length >= BATCH) flush();
    // segments/params are read through routeKey; the rest are refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, tracking]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Back in the foreground: a new session, the same screen again.
        sessionId.current = newScreenSessionId();
        if (route.current && !open.current) open.current = { ...route.current, startedAt: Date.now() };
      } else {
        close();
        flush();
      }
    });
    return () => sub.remove();
  }, []);
}
