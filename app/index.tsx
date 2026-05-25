import { router } from 'expo-router';
import { useEffect } from 'react';

import { BrandIntro } from '../components/BrandIntro';
import { Sentry, reportToSentry } from '../lib/sentry';
import { useAuthStore } from '../store/authStore';

// Build 25 (2026-05-25 IOS-LOGIN-106): executes a clean single-hop routing
// pattern from `/` straight to `/plaza` or `/login` upon store hydration.
// This completely avoids the double-hop `/` -> `/welcome` -> `/plaza` chain
// which was triggering navigation state collisions and animation freezes
// under the concurrent Fabric renderer on iOS.
export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    Sentry.captureMessage('startup:index_mounted', { level: 'info' });
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    const target = isAuthenticated ? '/plaza' : '/login';
    Sentry.captureMessage('startup:index_redirecting', {
      level: 'info',
      tags: { target, isAuthenticated: String(isAuthenticated) },
    });
    try {
      router.replace(target);
    } catch (err) {
      reportToSentry(err, { source: 'startup.index_redirect', target });
    }
  }, [hasHydrated, isAuthenticated]);

  return <BrandIntro debugLabel="INDEX" />;
}
