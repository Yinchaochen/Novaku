import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { api } from './api';
import { installedAppVersion } from './appVersion';
import { reportToSentry } from './sentry';
import { useLanguage } from '../context/LanguageContext';
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
// What the server was last told alongside the token: a change in either
// (travel, an app update) is worth one more registration.
let lastRegisteredTimeZone: string | undefined;
let lastRegisteredVersion: string | undefined;

// Push types that open a post and teach the profile what was opened (D-073, D-170).
const POST_PUSH_TYPES = new Set(['post_deadline', 'event_reminder', 'interest_pick']);

// A tap can arrive twice on a cold start (the launch response and the
// listener); route each notification once.
const handledResponses = new Set<string>();

function deviceTimeZone(): string | undefined {
  try {
    return Localization.getCalendars()[0]?.timeZone ?? undefined;
  } catch {
    return undefined;
  }
}

/** Request permission, get the native APNs/FCM token, and register it.
 * No-op on web and simulators — those can't receive remote push.
 * `suggestionsChannelName` names the Android channel for interest picks, so
 * people can mute suggestions without muting chat (D-170). */
export async function registerForPushNotificationsAsync(
  suggestionsChannelName?: string,
  { askPermission = true }: { askPermission?: boolean } = {},
): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
      });
      if (suggestionsChannelName) {
        await Notifications.setNotificationChannelAsync('suggestions', {
          name: suggestionsChannelName,
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
    }
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain && askPermission) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return;

    // Native token (APNs hex on iOS, FCM token on Android) — NOT an Expo token,
    // since the backend talks to APNs/FCM directly.
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    const tokenStr = String(token);
    const timezone = deviceTimeZone();
    const appVersion = installedAppVersion();
    if (
      !tokenStr ||
      (tokenStr === lastRegisteredToken &&
        timezone === lastRegisteredTimeZone &&
        appVersion === lastRegisteredVersion)
    ) {
      return;
    }

    await api.post('/notifications/device-token', {
      token: tokenStr,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      // The server sends newer push types only to builds that can open them,
      // and times suggestions by the phone's own zone (D-170).
      app_version: appVersion,
      timezone,
    });
    lastRegisteredToken = tokenStr;
    lastRegisteredTimeZone = timezone;
    lastRegisteredVersion = appVersion;
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
  lastRegisteredTimeZone = undefined;
  lastRegisteredVersion = undefined;
}

export function routeForNotification(
  router: ReturnType<typeof useRouter>,
  data: Record<string, unknown> | undefined,
  track: (events: CommunityRecommendationEventInput[]) => void,
): void {
  if (typeof data?.type === 'string' && POST_PUSH_TYPES.has(data.type) && typeof data.post_id === 'string') {
    // D-073: the tap itself is the signal — what someone opens from a push
    // outranks a scroll in the interest profile that picks the next one.
    // The slot id lets the server join the tap to why it was sent; the reason
    // itself never travels through Apple or Google (D-170).
    track([
      {
        event_name: 'push_open',
        session_id: getCommunitySessionId(),
        surface: 'push',
        post_id: data.post_id,
        metadata_json: {
          push_type: data.type,
          ...(typeof data.slot_id === 'string' ? { slot_id: data.slot_id } : {}),
        },
      },
    ]);
    router.push(`/p/${data.post_id}` as never);
    return;
  }
  if (data?.type === 'post_updated' && typeof data.post_id === 'string') {
    // D-171: a correction about a post the person already knew. Opening it
    // says nothing about what they want next, so it teaches the profile
    // nothing, and it is not a push session the feed metrics should count.
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
  const { t } = useLanguage();
  const suggestionsChannelName = t.settings.interest_push_channel;
  // Read through a ref so a language change renames the channel without
  // re-running registration (and its permission prompt).
  const channelNameRef = useRef(suggestionsChannelName);
  channelNameRef.current = suggestionsChannelName;

  useEffect(() => {
    if (!isAuthenticated) return;
    void registerForPushNotificationsAsync(channelNameRef.current);
    // Back from the background: tell the server if the phone's zone or the
    // build changed (a trip, an update). Never asks for permission again.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void registerForPushNotificationsAsync(channelNameRef.current, { askPermission: false });
      }
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isAuthenticated) return;
    void Notifications.setNotificationChannelAsync('suggestions', {
      name: suggestionsChannelName,
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {});
  }, [isAuthenticated, suggestionsChannelName]);

  useEffect(() => {
    const handle = (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (handledResponses.has(id)) return;
      handledResponses.add(id);
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      routeForNotification(router, data, track);
    };
    // A tap that launched the app from killed state may have fired before
    // this listener existed, and would open the app without opening the post.
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handle(response);
      })
      .catch(() => {});
    const responseSub = Notifications.addNotificationResponseReceivedListener(handle);
    const tokenSub = Notifications.addPushTokenListener(() => {
      if (useAuthStore.getState().isAuthenticated) {
        lastRegisteredToken = null; // token rotated — re-register the new one
        void registerForPushNotificationsAsync(channelNameRef.current, { askPermission: false });
      }
    });
    return () => {
      responseSub.remove();
      tokenSub.remove();
    };
  }, [router, track]);
}
