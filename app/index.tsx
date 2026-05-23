import { router } from 'expo-router';
import { useEffect } from 'react';

import { BrandIntro } from '../components/BrandIntro';

const WELCOME_ROUTE_DELAY_MS = 500;

// Keep a short React-owned first frame before the auth-aware welcome route.
// The native splash can disappear as soon as React is ready without becoming
// responsible for app navigation.
export default function Index() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/welcome');
    }, WELCOME_ROUTE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return <BrandIntro />;
}
