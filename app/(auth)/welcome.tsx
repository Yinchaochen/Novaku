import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

import { BrandIntro } from '../../components/BrandIntro';
import { signedOutLanding } from '../../lib/guestBrowsing';
import { useAuthStore } from '../../store/authStore';

export default function WelcomeScreen() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!hasHydrated) {
    return <BrandIntro />;
  }

  const target = isAuthenticated ? '/plaza' : signedOutLanding(Platform.OS);
  return <Redirect href={target} />;
}
