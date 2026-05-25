import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { BrandIntro } from '../components/BrandIntro';
import { addSentryBreadcrumb, Sentry } from '../lib/sentry';
import { useAuthStore } from '../store/authStore';

/**
 * Build 24 (2026-05-25 IOS-LOGIN-106): switched from imperative `useEffect +
 * setTimeout(500ms) + router.replace('/(auth)/welcome')` + 2 s fallback to
 * declarative `<Redirect />`. Reasons:
 *   - Expo Router docs recommend Redirect over imperative router.* in boot
 *     paths — Redirect is evaluated after layout is mounted, so it cannot
 *     race the root navigator's first commit.
 *   - BrandIntro debugLabel="INDEX" makes the root route visually
 *     distinguishable from the welcome route (label "WELCOME") and the
 *     native splash (no chip).
 *
 * Two-hop chain kept (index → welcome → login/plaza) so the WELCOME label
 * is reachable, which is the whole point of the diagnostic — we need to
 * know which route the user is actually visible on.
 */
export default function Index() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    Sentry.captureMessage('startup:index_mounted', { level: 'info' });
  }, []);

  if (!hasHydrated) {
    // Auth store still loading from SecureStore + /auth/me. Keep showing
    // the brand frame; once `_layout.tsx` AppBody.markHydrated() flips
    // hasHydrated to true, this component re-renders and falls through to
    // the Redirect branch below.
    return <BrandIntro debugLabel="INDEX" />;
  }

  // Authenticated users skip the welcome brand reveal — straight to plaza.
  // Unauthenticated users go through the welcome route so we can observe
  // the WELCOME label being reached.
  const target = isAuthenticated ? '/(tabs)/plaza' : '/(auth)/welcome';
  Sentry.captureMessage('startup:index_redirecting', {
    level: 'info',
    tags: { target, hasHydrated: 'true', isAuthenticated: String(isAuthenticated) },
  });
  addSentryBreadcrumb('startup:index_redirecting', { target });
  return <Redirect href={target} />;
}
