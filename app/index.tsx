import { router } from 'expo-router';
import { useEffect } from 'react';

import { BrandIntro } from '../components/BrandIntro';
import { reportToSentry } from '../lib/sentry';
import { useAuthStore } from '../store/authStore';

// Single-hop routing from `/` to `/plaza` (authenticated) or `/login`. The
// older double-hop `/ → /welcome → /plaza` chain caused navigation-state
// collisions and animation freezes under Fabric on iOS.
export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    const target = isAuthenticated ? '/plaza' : '/login';
    try {
      router.replace(target);
    } catch (err) {
      reportToSentry(err, { source: 'startup.index_redirect', target });
    }
  }, [hasHydrated, isAuthenticated]);

  return <BrandIntro />;
}
