import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { BrandIntro } from '../../components/BrandIntro';
import { addSentryBreadcrumb, Sentry } from '../../lib/sentry';
import { useAuthStore } from '../../store/authStore';

/**
 * Build 24 (2026-05-25 IOS-LOGIN-106): switched from useEffect +
 * setTimeout(1.5s) + setTimeout(5s hard fallback) + router.replace to
 * declarative `<Redirect />`. The visible brand moment now comes from
 * BrandIntro itself; redirect is evaluated by Expo Router synchronously
 * once hasHydrated flips.
 *
 * debugLabel="WELCOME" — visually distinguishable from `/` (INDEX) and
 * native splash (no chip). If the user reports being stuck on coral and
 * the chip says WELCOME, we know the index → welcome hop succeeded and
 * the failure is in the second hop or hydrate.
 */
export default function WelcomeScreen() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    Sentry.captureMessage('welcome:mounted', {
      level: 'info',
      tags: { hasHydrated: String(hasHydrated), isAuthenticated: String(isAuthenticated) },
    });
  }, []);

  if (!hasHydrated) {
    return <BrandIntro debugLabel="WELCOME" />;
  }

  const target = isAuthenticated ? '/(tabs)/plaza' : '/(auth)/login';
  Sentry.captureMessage('welcome:redirecting', {
    level: 'info',
    tags: { target, isAuthenticated: String(isAuthenticated) },
  });
  addSentryBreadcrumb('welcome:redirecting', { target });
  return <Redirect href={target} />;
}
