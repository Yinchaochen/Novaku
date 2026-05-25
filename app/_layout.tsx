import '../global.css';

import * as SplashScreen from 'expo-splash-screen';

import { initSentry } from '../lib/sentry';
import { installGlobalErrorHandler } from '../lib/globalErrorHandler';

initSentry();
installGlobalErrorHandler();

// Build 24 (2026-05-25 IOS-LOGIN-106): hold the native splash up until we
// explicitly call `hideAsync()` from AppBody's hydrate finally block. That
// makes "did the native splash actually hide?" an observable question via
// Sentry, instead of the previous BrandIntro.onLayout sync hide which
// swallowed errors. Wrapped in catch so a late call (Expo SDK 54 sometimes
// auto-hides on iOS 26 before this fires) doesn't throw.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already auto-hidden; nothing to prevent.
});

// Build 26 aggressive splash hide retry: prior builds reached AppBody's
// hydrate-finally block and called hideAsync, the call resolved without
// throwing, yet the native splash stayed on screen. Suspected iOS 26 +
// new arch + expo-splash-screen quirk where hideAsync acks but doesn't
// actually transition the LaunchScreen storyboard. Retry every 200ms for
// 5 s — idempotent so re-calls are safe; once it works, subsequent calls
// are no-ops.
let _splashHideTries = 0;
const _splashHideInterval = setInterval(() => {
  _splashHideTries += 1;
  SplashScreen.hideAsync().catch(() => {});
  if (_splashHideTries >= 25) {
    clearInterval(_splashHideInterval);
  }
}, 200);

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
import { addSentryBreadcrumb, reportToSentry, Sentry } from '../lib/sentry';
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

  // P2.9 (audit FE-MED-13): useFonts swallows errors. A missing font asset
  // in the EAS build silently falls back to system font with no signal.
  useEffect(() => {
    if (fontError) reportToSentry(fontError, { source: 'useFonts' });
  }, [fontError]);

  useEffect(() => {
    // Build 24 (2026-05-25): every boot phase emits a Sentry info event so
    // we can see exactly which phase is reached + when. If the user sees
    // BrandIntro stuck, the LAST captured boot:* event tells us where the
    // chain died. Crucially "boot:splash_hidden" or "boot:splash_hide_failed"
    // makes the native-splash question observable for the first time.
    Sentry.captureMessage('boot:hydrate_start', { level: 'info' });
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
        Sentry.captureMessage('boot:hydrate_finally', { level: 'info' });
        markHydrated();
        setReady(true);
        try {
          await SplashScreen.hideAsync();
          Sentry.captureMessage('boot:splash_hidden', { level: 'info' });
        } catch (err) {
          // Already hidden, or hideAsync threw — either way, capture so we
          // know the native splash status. iOS 26 sometimes auto-hides
          // before our explicit call, producing a benign "already hidden".
          Sentry.captureException(err, {
            tags: { source: 'splash.hideAsync' },
            level: 'warning',
          });
        }
      }
    })();
  }, [hydrate, markHydrated, setLangCode]);

  useEffect(() => {
    if (!ready) return;
    void markBootSuccess();
    addSentryBreadcrumb('boot:body_ready');
    SplashScreen.hideAsync().catch((err) => {
      reportToSentry(err, { source: '_layout.hide_splash' });
    });
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const isRootRoute = pathname === '/';
    const inAuthGroup = segments[0] === '(auth)';
    const isWelcome = inAuthGroup && segments[1] === 'welcome';
    const isPublicRoute = segments[0] === 'legal';
    if (!isAuthenticated && !isRootRoute && !inAuthGroup && !isPublicRoute) {
      if (lastRedirect.current !== 'welcome') {
        lastRedirect.current = 'welcome';
        router.replace('/welcome');
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
