import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { BrandIntro } from '../components/BrandIntro';
import { addSentryBreadcrumb, Sentry } from '../lib/sentry';
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
    addSentryBreadcrumb('startup:index_mounted');
    try {
      Sentry.captureMessage('startup:index_mounted', 'info');
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      addSentryBreadcrumb('startup:index_to_welcome');
      try {
        Sentry.captureMessage('startup:index_to_welcome', 'info');
        router.replace('/(auth)/welcome');
      } catch (err) {
        Sentry.captureException(err);
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
      Sentry.captureMessage(`startup:index_final_fallback:${target}`, 'info');
      router.replace(target);
    } catch (err) {
      Sentry.captureException(err);
    }
  }, [fallbackElapsed, hasHydrated, isAuthenticated]);

  return <BrandIntro />;
}
