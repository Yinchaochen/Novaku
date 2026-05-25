import NetInfo from '@react-native-community/netinfo';
import { QueryClient, onlineManager } from '@tanstack/react-query';

// P3.9 — wire React Native's network state into TanStack Query's
// onlineManager. Without this, the library falls back to
// `typeof navigator.onLine`, which is unreliable on RN (returns true even
// when airplane mode is on). With NetInfo, queries pause when offline
// and resume automatically when the device reconnects — no spinner-of-death
// while the user is on the subway, no "request failed" toasts when the
// real issue is "no network".
//
// IOS-LOGIN-106 (2026-05-25): netinfo 11.4.1 was not new-arch compatible —
// it called the legacy `RCTEventEmitter` callable JS module which is never
// registered under RN 0.81 + Fabric. Bumped to 12.0.1, which routes events
// through TurboModule. POSTERVIA-IOS-5/6 should no longer reproduce.
onlineManager.setEventListener((setOnline) => {
  const subscription = NetInfo.addEventListener((state) => {
    // `isConnected` is null while NetInfo determines initial state — treat
    // as online to avoid stalling queries on cold start. Once determined,
    // `isInternetReachable` is the stronger signal (DNS works) when
    // available, falling back to `isConnected` (link layer up).
    const isOnline =
      state.isConnected === false
        ? false
        : state.isInternetReachable !== false;
    setOnline(isOnline);
  });
  return () => subscription();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      // Default 'online' — when offline, query paused and resumes on reconnect.
      networkMode: 'online',
    },
    mutations: {
      retry: 0,
      // P3.9: 'offlineFirst' means the mutation runs once and only retries
      // if the device is offline (then it queues until connection returns).
      // Better UX than 'online' which would refuse to even start the
      // mutation while offline — many of our mutations have optimistic
      // updates that should fire immediately and reconcile when the network
      // comes back.
      networkMode: 'offlineFirst',
    },
  },
});
