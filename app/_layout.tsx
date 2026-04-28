import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet } from 'nativewind';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LanguageProvider, useLanguage } from '../context/LanguageContext';
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
    <SafeAreaProvider>
      <LanguageProvider>
        <AppBody />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

function AppBody() {
  const { setLangCode } = useLanguage();
  const hydrate = useAuthStore((s) => s.hydrate);
  const [ready, setReady] = useState(false);

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

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#5B67CA" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
