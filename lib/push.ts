import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { api } from './api';
import { reportToSentry } from './sentry';
import {
  type CommunityRecommendationEventInput,
  getCommunitySessionId,
  useTrackCommunityEvents,
} from '../features/community/useCommunity';
import { useAuthStore } from '../store/authStore';

// Foreground presentation: show the banner + add to the tray list, no badge
// management for v1 (the server sends content-less alerts without a badge).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// The last native token we successfully registered, so we don't POST it on
// every auth change. Reset on logout / token refresh to force re-registration.
let lastRegisteredToken: string | null = null;

/** Request permission, get the native APNs/FCM token, and register it.
 * No-op on web and simulators — those can't receive remote push. */
export async function registerForPushNotificationsAsync(): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return;

    // Native token (APNs hex on iOS, FCM token on Android) — NOT an Expo token,
    // since the backend talks to APNs/FCM directly.
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    const tokenStr = String(token);
    if (!tokenStr || tokenStr === lastRegisteredToken) return;

    await api.post('/notifications/device-token', {
      token: tokenStr,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    lastRegisteredToken = tokenStr;
  } catch (err) {
    reportToSentry(err, { source: 'push.register' });
  }
}

/** Drop this device's token on logout so the next account doesn't inherit it.
 * Best-effort — the backend also prunes dead tokens on send. */
export async function unregisterPushTokenAsync(): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  try {
    let token = lastRegisteredToken;
    if (!token) {
      const resp = await Notifications.getDevicePushTokenAsync();
      token = String(resp.data);
    }
    if (token) {
      await api.delete('/notifications/device-token', { params: { token } });
    }
  } catch {
    // ignore — server-side pruning covers stale tokens
  }
  lastRegisteredToken = null;
}

function routeForNotification(
  router: ReturnType<typeof useRouter>,
  data: Record<string, unknown> | undefined,
  track: (events: CommunityRecommendationEventInput[]) => void,
): void {
  if (data?.type === 'post_deadline' && typeof data.post_id === 'string') {
    // D-073: the tap itself is the signal — what someone opens from a push
    // outranks a scroll in the interest profile that picks the next one.
    track([
      {
        event_name: 'push_open',
        session_id: getCommunitySessionId(),
        surface: 'push',
        post_id: data.post_id,
      },
    ]);
    router.push(`/p/${data.post_id}` as never);
    return;
  }
  // No dedicated conversation route exists yet, so we land the user on the
  // relevant tab (parity with the in-app notification center).
  if (data?.type === 'comment_reply') {
    router.push('/(tabs)/plaza');
  } else {
    router.push('/(tabs)/social');
  }
}

/** Wire push into the app shell: register on auth, route on tap, re-register on
 * native token rotation. Call once near the root. */
export function usePushNotifications(): void {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { mutate: track } = useTrackCommunityEvents();

  useEffect(() => {
    if (isAuthenticated) void registerForPushNotificationsAsync();
  }, [isAuthenticated]);

  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      routeForNotification(router, data, track);
    });
    const tokenSub = Notifications.addPushTokenListener(() => {
      if (useAuthStore.getState().isAuthenticated) {
        lastRegisteredToken = null; // token rotated — re-register the new one
        void registerForPushNotificationsAsync();
      }
    });
    return () => {
      responseSub.remove();
      tokenSub.remove();
    };
  }, [router, track]);
}
