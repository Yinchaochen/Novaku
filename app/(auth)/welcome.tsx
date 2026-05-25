import { Redirect } from 'expo-router';

import { BrandIntro } from '../../components/BrandIntro';
import { useAuthStore } from '../../store/authStore';

export default function WelcomeScreen() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!hasHydrated) {
    return <BrandIntro />;
  }

  const target = isAuthenticated ? '/plaza' : '/login';
  return <Redirect href={target} />;
}
