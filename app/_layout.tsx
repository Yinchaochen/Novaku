import '../global.css';

import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet } from 'nativewind';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { PendingDeletionBanner } from '../components/PendingDeletionBanner';
import { queryClient } from '../lib/queryClient';
import { useAuthStore } from '../store/authStore';

const STARTUP_TIMEOUT_MS = 3000;

(
  StyleSheet as typeof StyleSheet & {
    setFlag?: (name: string, value: string) => void;
  }
).setFlag?.('darkMode', 'class');

function withStartupTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), STARTUP_TIMEOUT_MS);
    }),
  ]);
}

export default function RootLayout() {
  return (
    // GestureHandlerRootView is required so pan / pinch handlers (currently
    // used by AvatarCropper) actually receive events on Android.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <AppBody />
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppBody() {
  const { setLangCode } = useLanguage();
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const lastRedirect = useRef<string | null>(null);

  // Load Plus Jakarta Sans for display typography. Body text falls back to
  // system fonts (better Chinese / CJK rendering). We don't gate the render
  // on fonts anymore — the welcome screen mounts immediately so the boot
  // sequence is one continuous brand reveal (no splash → welcome jump-cut).
  // Once fonts arrive the wordmark text re-paints in the right family.
  useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    (async () => {
      try {
        await withStartupTimeout(hydrate(), false);
        const user = useAuthStore.getState().user;
        if (user?.locale) {
          void setLangCode(user.locale);
        }
      } catch {
        // hydration errors must not block the app
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === '(auth)';
    const isWelcome = inAuthGroup && segments[1] === 'welcome';
    const isPublicRoute = segments[0] === 'legal';
    if (!isAuthenticated && !inAuthGroup && !isPublicRoute) {
      // First-time / logged-out users land on the welcome screen briefly,
      // then welcome.tsx auto-redirects to /(auth)/login after 1s.
      if (lastRedirect.current !== 'welcome') {
        lastRedirect.current = 'welcome';
        router.replace('/(auth)/welcome');
      }
    } else if (isAuthenticated && inAuthGroup && !isWelcome) {
      // Authenticated users who land on login / register / forgot-password
      // bounce to plaza immediately. Welcome itself is exempt — it owns its
      // own auth-aware 1-second redirect to keep the brand-reveal moment.
      if (lastRedirect.current !== 'plaza') {
        lastRedirect.current = 'plaza';
        router.replace('/(tabs)/plaza');
      }
    } else {
      lastRedirect.current = null;
    }
  }, [ready, isAuthenticated, segments, router]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Cream / peach backgrounds need dark status-bar text on both platforms.
          Android defaults to light content; iOS usually picks dark but declaring
          explicitly avoids surprises when the system theme is dark. Welcome
          itself overrides to "light" while it's the active route. */}
      <StatusBar style="dark" />
      {isAuthenticated ? <PendingDeletionBanner /> : null}
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
