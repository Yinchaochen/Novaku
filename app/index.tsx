import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { BrandIntro } from '../components/BrandIntro';
import { addSentryBreadcrumb, reportToSentry, Sentry } from '../lib/sentry';
import { useAuthStore } from '../store/authStore';

const WELCOME_ROUTE_DELAY_MS = 500;
const FINAL_ROUTE_FALLBACK_DELAY_MS = 2000;

// Keep a short React-owned first frame before the auth-aware welcome route.
// The native splash can disappear as soon as React is ready without becoming
// responsible for app navigation.
export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const [fallbackElapsed, setFallbackElapsed] = useState(false);

  useEffect(() => {
    // Build 23 diagnostic (2026-05-25): re-enable captureMessage at boot
    // navigation points. We removed these in commit 3e94220 thinking they
    // caused splash freeze (they didn't; the cause was the new-arch
    // RCTEventEmitter race that Build 22 finally resolved). Now we're
    // diagnosing a DOWNSTREAM problem — user stuck on BrandIntro — so we
    // need explicit signals to know which navigation step is failing.
    Sentry.captureMessage('startup:index_mounted', { level: 'info' });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      Sentry.captureMessage('startup:index_to_welcome_attempt', { level: 'info' });
      try {
        router.replace('/(auth)/welcome');
        Sentry.captureMessage('startup:index_to_welcome_called', { level: 'info' });
      } catch (err) {
        reportToSentry(err, { source: 'startup.index_to_welcome' });
      }
    }, WELCOME_ROUTE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFallbackElapsed(true);
    }, FINAL_ROUTE_FALLBACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!fallbackElapsed || !hasHydrated) return;
    const target = isAuthenticated ? '/(tabs)/plaza' : '/(auth)/login';
    addSentryBreadcrumb('startup:index_final_fallback', { target });
    try {
      router.replace(target);
    } catch (err) {
      reportToSentry(err, { source: 'startup.index_final_fallback', target });
    }
  }, [fallbackElapsed, hasHydrated, isAuthenticated]);

  return <BrandIntro />;
}
