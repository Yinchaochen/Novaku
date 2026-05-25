import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { BrandIntro } from '../../components/BrandIntro';
import { addSentryBreadcrumb, Sentry } from '../../lib/sentry';
import { useAuthStore } from '../../store/authStore';

const REDIRECT_DELAY_MS = 1500;
// Build 22 (PID 4943, 2026-05-25) showed the user stuck on BrandIntro
// indefinitely — `hasHydrated` somehow never flips to true even though the
// _layout.tsx finally block should ALWAYS call markHydrated(). Hard fallback:
// after 5 s, navigate regardless of hydration state. Worst case: user lands on
// login and re-authenticates (harmless).
const HARD_FALLBACK_MS = 5000;

/**
 * Welcome / brand-reveal screen. Shown after the short root brand frame, then
 * auto-redirects auth-aware:
 *   - authenticated -> /(tabs)/plaza
 *   - not authenticated -> /(auth)/login
 */
export default function WelcomeScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [hardFallbackElapsed, setHardFallbackElapsed] = useState(false);

  useEffect(() => {
    addSentryBreadcrumb('welcome:mounted', { hasHydrated, isAuthenticated });
    const minTimer = setTimeout(() => setMinimumElapsed(true), REDIRECT_DELAY_MS);
    const hardTimer = setTimeout(() => setHardFallbackElapsed(true), HARD_FALLBACK_MS);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(hardTimer);
    };
  }, []);

  // Two acceptable conditions:
  //   (a) hydrate finished AND visible-brand moment elapsed (happy path)
  //   (b) hard fallback timer fired — go anyway, hydrate is stuck.
  useEffect(() => {
    if (!minimumElapsed) return;
    const canProceedNormally = hasHydrated;
    if (!canProceedNormally && !hardFallbackElapsed) return;

    const target = isAuthenticated ? '/(tabs)/plaza' : '/(auth)/login';
    if (!canProceedNormally) {
      // We're proceeding via the hard fallback — capture so we know it fired.
      Sentry.captureMessage('welcome:hard_fallback_navigated', {
        level: 'warning',
        tags: { target, hasHydrated: 'false', isAuthenticated: String(isAuthenticated) },
      });
    } else {
      addSentryBreadcrumb('welcome:navigating', { target });
    }
    try {
      router.replace(target);
    } catch (err) {
      Sentry.captureException(err, { tags: { source: 'welcome.router_replace' } });
    }
  }, [hasHydrated, isAuthenticated, minimumElapsed, hardFallbackElapsed]);

  return <BrandIntro />;
}
