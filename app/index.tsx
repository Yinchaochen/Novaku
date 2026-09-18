import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

import { BrandIntro } from '../components/BrandIntro';
import { useAuthStore } from '../store/authStore';
import { signedOutLanding } from '../lib/guestBrowsing';

// Single-hop routing from `/` to `/plaza` (authenticated) or `/login`. The
// older double-hop `/ → /welcome → /plaza` chain caused navigation-state
// collisions and animation freezes under Fabric on iOS.
export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  if (!hasHydrated) {
    return <BrandIntro />;
  }

  // A signed-out web visitor lands on the wall, not on a login form (D-151).
  return <Redirect href={isAuthenticated ? '/plaza' : signedOutLanding(Platform.OS)} />;
}
