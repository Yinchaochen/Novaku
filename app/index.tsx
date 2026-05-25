import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { BrandIntro } from '../components/BrandIntro';
import { addSentryBreadcrumb, Sentry } from '../lib/sentry';
import { useAuthStore } from '../store/authStore';

/**
 * Build 26 (2026-05-25 IOS-LOGIN-106): restored Build 24's declarative
 * <Redirect /> pattern after a prior agent reverted to the imperative
 * useEffect + setTimeout(500ms) + router.replace chain. That older pattern
 * is documented by Expo Router (issue #40740) to silently fail when the
 * root navigator hasn't mounted by the time setTimeout fires — exactly
 * the race we're chasing.
 *
 * Also restores `<BrandIntro debugLabel="INDEX" />` so the right-bottom
 * chip shows "INDEX" whenever React is rendering this route. If the user
 * sees coral with NO chip, they're on the native splash; with "INDEX"
 * chip, React reached `/` but hasHydrated never flipped; with "WELCOME"
 * chip, the first redirect succeeded.
 */
export default function Index() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    Sentry.captureMessage('startup:index_mounted', { level: 'info' });
  }, []);

  if (!hasHydrated) {
    return <BrandIntro debugLabel="INDEX" />;
  }

  const target = isAuthenticated ? '/plaza' : '/welcome';
  Sentry.captureMessage('startup:index_redirecting', {
    level: 'info',
    tags: { target, hasHydrated: 'true', isAuthenticated: String(isAuthenticated) },
  });
  addSentryBreadcrumb('startup:index_redirecting', { target });
  return <Redirect href={target} />;
}
