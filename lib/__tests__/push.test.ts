jest.mock('expo-device', () => ({ isDevice: true }));
const mockZone = { current: 'Europe/Berlin' };
jest.mock('expo-localization', () => ({ getCalendars: () => [{ timeZone: mockZone.current }] }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  getDevicePushTokenAsync: jest.fn(() => Promise.resolve({ data: 'device-token-1' })),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
}));
const mockRouter = { push: jest.fn() };
const mockPathname = { current: '/' };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname.current,
}));
jest.mock('../api', () => ({ api: { post: jest.fn(() => Promise.resolve({})), delete: jest.fn() } }));
jest.mock('../appVersion', () => ({ installedAppVersion: () => '1.5.5' }));
jest.mock('../sentry', () => ({ reportToSentry: jest.fn() }));
jest.mock('../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));
jest.mock('../../features/community/useCommunity', () => ({
  getCommunitySessionId: () => 'session-1',
  useTrackCommunityEvents: jest.fn(),
}));

import { act, renderHook } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { useLanguage } from '../../context/LanguageContext';
import { useTrackCommunityEvents } from '../../features/community/useCommunity';
import { useAuthStore } from '../../store/authStore';
import { api } from '../api';
import {
  notificationData,
  registerForPushNotificationsAsync,
  routeForNotification,
  usePushNotifications,
} from '../push';

function fakeRouter() {
  return { push: jest.fn() } as unknown as Parameters<typeof routeForNotification>[0];
}

describe('push routing (D-170)', () => {
  it('opens the post for an interest pick and reports the slot, not a reason', () => {
    const router = fakeRouter();
    const track = jest.fn();
    routeForNotification(router, { type: 'interest_pick', post_id: 'p1', slot_id: 's1' }, track);
    expect((router as unknown as { push: jest.Mock }).push).toHaveBeenCalledWith('/p/p1');
    expect(track).toHaveBeenCalledWith([
      expect.objectContaining({
        event_name: 'push_open',
        surface: 'push',
        post_id: 'p1',
        metadata_json: { push_type: 'interest_pick', slot_id: 's1' },
      }),
    ]);
  });

  it('keeps the deadline reminder on the same path', () => {
    const router = fakeRouter();
    const track = jest.fn();
    routeForNotification(router, { type: 'post_deadline', post_id: 'p2' }, track);
    expect((router as unknown as { push: jest.Mock }).push).toHaveBeenCalledWith('/p/p2');
    expect(track.mock.calls[0][0][0].metadata_json).toEqual({ push_type: 'post_deadline' });
  });

  it('opens the post for a correction without counting it as interest (D-171)', () => {
    const router = fakeRouter();
    const track = jest.fn();
    routeForNotification(router, { type: 'post_updated', post_id: 'p3' }, track);
    expect((router as unknown as { push: jest.Mock }).push).toHaveBeenCalledWith('/p/p3');
    expect(track).not.toHaveBeenCalled();
  });

  it('opens the post a reply is on, without a learning signal (2026-10-25)', () => {
    // Replies used to land on the Plaza feed, which is the bug people reported.
    const router = fakeRouter();
    const track = jest.fn();
    routeForNotification(router, { type: 'comment_reply', post_id: 'p4' }, track);
    expect((router as unknown as { push: jest.Mock }).push).toHaveBeenCalledWith('/p/p4');
    expect(track).not.toHaveBeenCalled();
  });

  it('opens the post a moderation notice is about', () => {
    const router = fakeRouter();
    routeForNotification(router, { type: 'video_moderation_rejected', post_id: 'p5' }, jest.fn());
    expect((router as unknown as { push: jest.Mock }).push).toHaveBeenCalledWith('/p/p5');
  });

  it('sends other types to the Social tab without a learning signal', () => {
    const router = fakeRouter();
    const track = jest.fn();
    routeForNotification(router, { type: 'friend_request' }, track);
    expect((router as unknown as { push: jest.Mock }).push).toHaveBeenCalledWith('/(tabs)/social');
    expect(track).not.toHaveBeenCalled();
  });
});

describe('device registration (D-170)', () => {
  it('reports the build and the phone time zone with the token', async () => {
    await registerForPushNotificationsAsync('Suggestions');
    expect(api.post).toHaveBeenCalledWith('/notifications/device-token', {
      token: 'device-token-1',
      platform: expect.any(String),
      app_version: '1.5.5',
      timezone: 'Europe/Berlin',
    });
  });
});

describe('re-registration (D-170)', () => {
  it('reports again only when the zone changes, and never re-asks for permission', async () => {
    (api.post as jest.Mock).mockClear();
    await registerForPushNotificationsAsync('Suggestions', { askPermission: false });
    expect(api.post).not.toHaveBeenCalled(); // same token, zone and build as before

    mockZone.current = 'Asia/Shanghai';
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false, canAskAgain: true });
    await registerForPushNotificationsAsync('Suggestions', { askPermission: false });
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();

    await registerForPushNotificationsAsync('Suggestions', { askPermission: false });
    expect(api.post).toHaveBeenCalledWith(
      '/notifications/device-token',
      expect.objectContaining({ timezone: 'Asia/Shanghai' }),
    );
  });
});

function request(content: unknown, trigger: unknown) {
  return { identifier: 'n1', content, trigger } as unknown as Notifications.NotificationRequest;
}

describe('notificationData (2026-10-25)', () => {
  it('reads the APNs payload on iOS, where content.data is empty for a direct push', () => {
    // expo-notifications only fills content.data from a `body` key; the server
    // put its fields at the top of the payload.
    const data = notificationData(
      request({ data: null }, { type: 'push', payload: { aps: {}, type: 'comment_reply', post_id: 'p6' } }),
    );
    expect(data).toEqual(expect.objectContaining({ type: 'comment_reply', post_id: 'p6' }));
  });

  it('prefers content.data when it carries the fields', () => {
    const data = notificationData(
      request({ data: { type: 'post_deadline', post_id: 'p7' } }, { type: 'push', payload: { aps: {} } }),
    );
    expect(data).toEqual({ type: 'post_deadline', post_id: 'p7' });
  });

  it('falls back to the FCM data on Android', () => {
    const data = notificationData(
      request({ data: {} }, { type: 'push', remoteMessage: { data: { type: 'interest_pick', post_id: 'p8' } } }),
    );
    expect(data).toEqual({ type: 'interest_pick', post_id: 'p8' });
  });
});

describe('a tap that launches the app (2026-10-25)', () => {
  it('opens the post only after sign-in is known and the index route has moved on', async () => {
    // On a cold start the tap arrives before the navigator is mounted. Routing
    // then threw, the catch swallowed it, and the app stayed on the Plaza.
    mockRouter.push.mockClear();
    mockPathname.current = '/';
    useAuthStore.setState({ hasHydrated: false, isAuthenticated: false });
    (useLanguage as jest.Mock).mockReturnValue({ t: { settings: { interest_push_channel: 'Suggestions' } } });
    (useTrackCommunityEvents as jest.Mock).mockReturnValue({ mutate: jest.fn() });
    (Notifications.getLastNotificationResponseAsync as jest.Mock).mockResolvedValueOnce({
      notification: {
        request: request(
          { data: null },
          { type: 'push', payload: { aps: {}, type: 'comment_reply', post_id: 'p9' } },
        ),
      },
    });

    const { rerender } = await renderHook(() => usePushNotifications());
    await act(async () => {});
    expect(mockRouter.push).not.toHaveBeenCalled();

    await act(() => {
      useAuthStore.setState({ hasHydrated: true });
    });
    expect(mockRouter.push).not.toHaveBeenCalled(); // the index route is still redirecting

    mockPathname.current = '/plaza';
    await rerender({});
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith('/p/p9');
  });
});
