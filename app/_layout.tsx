import '../global.css';

// Crash / error infrastructure must initialize BEFORE any other import so the
// global handler is armed if anything below throws on module load.
import * as SplashScreen from 'expo-splash-screen';

import { initSentry, Sentry } from '../lib/sentry';
import { installGlobalErrorHandler } from '../lib/globalErrorHandler';

initSentry();
installGlobalErrorHandler();
SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden on hot reload; that's fine.
});

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

import { BootDebugScreen } from '../components/BootDebugScreen';
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
import { addSentryBreadcrumb } from '../lib/sentry';
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

// Capture an early boot event the moment JS reaches this module. If Sentry
// is healthy this is the first signal we'll see — and its absence in the
// dashboard is itself a strong signal that JS bundle never loaded.
try {
  Sentry.captureMessage('boot:module_loaded', 'info');
} catch {
  // Sentry may not be initialized yet (no DSN, dev mode); ignore.
}

function RootLayout() {
  const [bootPhase, setBootPhase] = useState<string>('module_loaded');
  const [debugLog, setDebugLog] = useState<string[]>(['module_loaded']);
  const [failureCount, setFailureCount] = useState(0);
  const [inSafeMode, setInSafeMode] = useState(false);
  const [bootReady, setBootReady] = useState(false);

  const advancePhase = (phase: string) => {
    const stamp = String(Date.now() % 1_000_000).padStart(6, '0');
    setBootPhase(phase);
    setDebugLog((prev) => [...prev, `${stamp} ${phase}`]);
    addSentryBreadcrumb(`boot:${phase}`);
    try {
      Sentry.captureMessage(`boot:${phase}`, 'info');
    } catch {
      // best-effort
    }
  };

  useEffect(() => {
    // Hide splash immediately so the debug overlay is visible if anything
    // below hangs. On a healthy boot the user never sees the overlay long
    // enough to register it as a distinct screen — it just looks like
    // splash → welcome.
    SplashScreen.hideAsync().catch(() => {});

    (async () => {
      try {
        advancePhase('loading_state');
        const state = await loadBootState();
        advancePhase(`state_loaded(fail=${state.failureCount})`);
        setFailureCount(state.failureCount);

        if (state.shouldEnterSafeMode) {
          advancePhase('entering_safe_mode');
          setInSafeMode(true);
          return;
        }

        advancePhase('arming_watchdog');
        await startBootWatchdog(state.failureCount);
        advancePhase('watchdog_armed');

        setBootReady(true);
        advancePhase('boot_ready');
      } catch (err) {
        advancePhase(`error:${String(err).slice(0, 80)}`);
        try {
          Sentry.captureException(err);
        } catch {
          // best-effort
        }
      }
    })();
  }, []);

  const handleRetry = async () => {
    await resetBootCounter();
    setFailureCount(0);
    setInSafeMode(false);
    setBootReady(false);
    advancePhase('retry_arming_watchdog');
    await startBootWatchdog(0);
    setBootReady(true);
    advancePhase('retry_boot_ready');
  };

  if (inSafeMode) {
    return <SafeModeScreen failureCount={failureCount} onRetry={handleRetry} />;
  }

  if (!bootReady) {
    return <BootDebugScreen phase={bootPhase} log={debugLog} />;
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

export default Sentry.wrap(RootLayout);

function AppBody() {
  const { setLangCode } = useLanguage();
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const lastRedirect = useRef<string | null>(null);

  useEffect(() => {
    void markBootSuccess();
    try {
      Sentry.captureMessage('boot:body_mounted', 'info');
    } catch {
      // best-effort
    }
  }, []);

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
      if (lastRedirect.current !== 'welcome') {
        lastRedirect.current = 'welcome';
        router.replace('/(auth)/welcome');
      }
    } else if (isAuthenticated && inAuthGroup && !isWelcome) {
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
      <StatusBar style="dark" />
      {isAuthenticated ? <PendingDeletionBanner /> : null}
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
