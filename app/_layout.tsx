import '../global.css';

import { initSentry } from '../lib/sentry';
import { installGlobalErrorHandler } from '../lib/globalErrorHandler';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Sentry + global error handler must run at module top, before any React
// imports below resolve — an error during their evaluation otherwise goes
// uncaptured.
initSentry();
installGlobalErrorHandler();

// IOS-LOGIN-114 (2026-05-27): Android-only explicit splash control.
//
// Background: Build 28 (d3a70ae) removed all explicit SplashScreen.* calls
// because expo-splash-screen's hideAsync was crashing the iOS 26 + new arch
// crossfade (SBCrossfadeView "frame not updated"). That fix worked for iOS,
// but it exposed a latent Android 12+ issue: Android's SplashScreen API
// treats `splash-brand.png` as a centered icon constrained to ~192dp inside
// a fixed display area, so the wide rectangular arch + POSTERVIA + tagline
// gets cropped. Pre-Build-28, the native splash was visible for milliseconds
// before JS-driven hideAsync swapped to BrandIntro — too brief to notice the
// crop. Post-Build-28, the native splash sticks around for the full bundle
// load (1-3s) and the crop is glaringly visible.
//
// Compromise: re-enable prevent + hide ONLY on Android. iOS keeps Build 28's
// default behaviour (auto-hide on first-frame-commit, no JS control) to
// avoid reintroducing the iOS 26 freeze. .catch swallows any failure — if
// preventAutoHideAsync is racing the native auto-hide, that's fine; the
// hideAsync below is the load-bearing call.
if (Platform.OS === 'android') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

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
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { PendingDeletionBanner } from '../components/PendingDeletionBanner';
import { SafeModeScreen } from '../components/SafeModeScreen';
import {
  loadBootState,
  markBootSuccess,
  resetBootCounter,
  startBootWatchdog,
} from '../lib/bootWatchdog';
import { addSentryBreadcrumb, reportToSentry } from '../lib/sentry';
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

function RootLayout() {
  const [failureCount, setFailureCount] = useState(0);
  const [inSafeMode, setInSafeMode] = useState(false);

  const advancePhase = (phase: string) => {
    addSentryBreadcrumb(`boot:${phase}`);
  };

  useEffect(() => {
    addSentryBreadcrumb('boot:rootlayout_useeffect_fired');
    (async () => {
      try {
        advancePhase('loading_state');
        const state = await withStartupTimeout(loadBootState(), {
          failureCount: 0,
          shouldEnterSafeMode: false,
        });
        advancePhase(`state_loaded(fail=${state.failureCount})`);
        setFailureCount(state.failureCount);

        if (state.shouldEnterSafeMode) {
          advancePhase('entering_safe_mode');
          setInSafeMode(true);
          return;
        }

        advancePhase('arming_watchdog');
        await withStartupTimeout(startBootWatchdog(state.failureCount), undefined);
        advancePhase('watchdog_armed');

        advancePhase('boot_ready');
      } catch (err) {
        advancePhase(`error:${String(err).slice(0, 80)}`);
        reportToSentry(err, { source: '_layout.boot' });
      }
    })();
  }, []);

  const handleRetry = async () => {
    await resetBootCounter();
    setFailureCount(0);
    setInSafeMode(false);
    advancePhase('retry_arming_watchdog');
    await withStartupTimeout(startBootWatchdog(0), undefined);
    advancePhase('retry_boot_ready');
  };

  if (inSafeMode) {
    return <SafeModeScreen failureCount={failureCount} onRetry={handleRetry} />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <LanguageProvider>
            <AppBody />
          </LanguageProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

// Keep the root export plain. Sentry.wrap is unsafe on iOS 26 + new arch.
export default RootLayout;

function AppBody() {
  const { setLangCode } = useLanguage();
  const hydrate = useAuthStore((s) => s.hydrate);
  const markHydrated = useAuthStore((s) => s.markHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const lastRedirect = useRef<string | null>(null);

  const [, fontError] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // IOS-LOGIN-114: Android-only native splash dismiss. AppBody mounting
  // means RootLayout's full tree (including the `/` route → BrandIntro) has
  // committed its first frame. Hiding the native splash now reveals
  // BrandIntro — the same image at the same imageWidth, so visually
  // seamless. iOS path: no-op; iOS continues to rely on the OS
  // first-frame-commit auto-hide (Build 28 decision, kept to avoid the
  // iOS 26 SBCrossfadeView freeze).
  useEffect(() => {
    if (Platform.OS === 'android') {
      SplashScreen.hideAsync().catch(() => {
        // If hide fails (e.g. already hidden by OS race), no-op. The native
        // splash will be gone within a frame either way.
      });
    }
  }, []);

  // P2.9 (audit FE-MED-13): useFonts swallows errors. A missing font asset
  // in the EAS build silently falls back to system font with no signal.
  useEffect(() => {
    if (fontError) reportToSentry(fontError, { source: 'useFonts' });
  }, [fontError]);

  useEffect(() => {
    (async () => {
      try {
        await withStartupTimeout(hydrate(), false);
        const user = useAuthStore.getState().user;
        if (user?.locale) {
          void setLangCode(user.locale);
        }
      } catch (err) {
        // P2.9 (audit FE-MED-12): hydration errors must not block the app,
        // but they also must not be invisible. Most errors are caught inside
        // authStore.hydrate(); this outer catch fires when the dynamic
        // import('../lib/api') itself fails or some other non-axios path
        // throws — silent here cascades to "user mysteriously not logged in".
        reportToSentry(err, { source: '_layout.hydrate_outer' });
      } finally {
        markHydrated();
        setReady(true);
      }
    })();
  }, [hydrate, markHydrated, setLangCode]);

  useEffect(() => {
    if (!ready) return;
    void markBootSuccess();
    addSentryBreadcrumb('boot:body_ready');
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const isRootRoute = pathname === '/';
    const inAuthGroup = segments[0] === '(auth)';
    const isWelcome = inAuthGroup && segments[1] === 'welcome';
    const isPublicRoute = segments[0] === 'legal';
    if (!isAuthenticated && !isRootRoute && !inAuthGroup && !isPublicRoute) {
      if (lastRedirect.current !== 'login') {
        lastRedirect.current = 'login';
        router.replace('/login');
      }
    } else if (isAuthenticated && inAuthGroup && !isWelcome) {
      if (lastRedirect.current !== 'plaza') {
        lastRedirect.current = 'plaza';
        router.replace('/plaza');
      }
    } else {
      lastRedirect.current = null;
    }
  }, [ready, isAuthenticated, pathname, segments, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      {isAuthenticated ? <PendingDeletionBanner /> : null}
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
