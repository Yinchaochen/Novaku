import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { BrandIntro } from '../../components/BrandIntro';
import { useAuthStore } from '../../store/authStore';

const REDIRECT_DELAY_MS = 1500;

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumElapsed(true);
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Wait for both the visible brand moment and auth hydrate. If SecureStore is
  // slow, correctness wins; otherwise welcome stays on-screen for 1.5 seconds.
  useEffect(() => {
    if (!minimumElapsed || !hasHydrated) return;
    router.replace(isAuthenticated ? '/(tabs)/plaza' : '/(auth)/login');
  }, [hasHydrated, isAuthenticated, minimumElapsed]);

  return <BrandIntro />;
}
