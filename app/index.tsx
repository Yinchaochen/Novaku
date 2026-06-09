import { Redirect } from 'expo-router';

import { BrandIntro } from '../components/BrandIntro';
import { useAuthStore } from '../store/authStore';

// Single-hop routing from `/` to `/plaza` (authenticated) or `/login`. The
// older double-hop `/ → /welcome → /plaza` chain caused navigation-state
// collisions and animation freezes under Fabric on iOS.
export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  if (!hasHydrated) {
    return <BrandIntro />;
  }

  return <Redirect href={isAuthenticated ? '/plaza' : '/login'} />;
}
