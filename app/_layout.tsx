import '../global.css';

import { initSentry } from '../lib/sentry';
import { installGlobalErrorHandler } from '../lib/globalErrorHandler';

initSentry();
installGlobalErrorHandler();

// Build 28 (2026-05-25 IOS-LOGIN-106): REMOVED all explicit SplashScreen
// control (no preventAutoHideAsync, no hideAsync, no retry loop). iPhone
// syslog showed SpringBoardUI raising:
//   "Live host view super view[<SBCrossfadeView ...>] not matching
//    container view[<UIView ...>], frame not updated"
// at every cold start. This is iOS 26's strict scene-lifecycle crossfade
// path failing when expo-splash-screen tries to crossfade launch-storyboard
// out to the RN root view — the RCTRootView ends up in an unexpected
// parent and iOS bails on the transition, leaving the user staring at
// either the stuck storyboard (coral) or the empty default UIWindow
// (white).
//
// Fix path: let iOS handle splash with its OWN default "auto-hide on first
// frame commit" behavior. We pair this with `UIApplicationSceneManifest`
// in app.json's ios.infoPlist explicitly declaring single-scene support,
// which is what iOS 26 actually wants us to opt into.

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

/**
 * Build 27 (2026-05-25 IOS-LOGIN-106): on-change boot-state diagnostic.
 *
 * Mounts inside AppBody so it has access to Expo Router's pathname/segments
 * plus the auth-store flags. Captures a Sentry info event EVERY time any of
 * { pathname, segments, hasHydrated, isAuthenticated } changes — and ONLY
 * when they change. Cheaper than 1Hz polling, denser than the boot:* probes,
 * and definitively answers the question "did router.replace silently fail?".
 *
 * Expected timeline (healthy boot):
 *   diag:state_change { pathname: "/", hasHydrated: "false" }
 *   diag:state_change { pathname: "/", hasHydrated: "true" }   ← hydrate done
 *   diag:state_change { pathname: "/plaza" or "/login", ... }   ← router moved
 *
 * Smoking-gun pattern (router.replace silent fail):
 *   diag:state_change { pathname: "/", hasHydrated: "false" }
 *   diag:state_change { pathname: "/", hasHydrated: "true", isAuthenticated: "true" }
 *   ...nothing else for >30 s while user stares at coral...
 *
 * That stale tail = imperative router.replace fired but the navigator never
 * committed the new pathname. At that point the only fix is to swap back to
 * declarative <Redirect /> in app/index.tsx.
 */
function BootDiagnostic() {
  const pathname = usePathname();
  const segments = useSegments();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    Sentry.captureMessage('diag:state_change', {
      level: 'info',
      tags: {
        pathname: pathname || '(empty)',
        segments_joined: segments.join('/') || '(empty)',
        hasHydrated: String(hasHydrated),
        isAuthenticated: String(isAuthenticated),
      },
    });
  }, [pathname, segments.join('/'), hasHydrated, isAuthenticated]);

  return null;
}

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
        // Build 28: removed SplashScreen.hideAsync() — iOS 26's strict
        // scene-lifecycle path makes explicit hideAsync fail with
        // "Live host view super view not matching container view".
        // Letting iOS auto-hide on first frame commit is more reliable.
      }
    })();
  }, [hydrate, markHydrated, setLangCode]);

  useEffect(() => {
    if (!ready) return;
    void markBootSuccess();
    addSentryBreadcrumb('boot:body_ready');
    // Build 28: removed second hideAsync call here for same reason.
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
      <BootDiagnostic />
      {isAuthenticated ? <PendingDeletionBanner /> : null}
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
