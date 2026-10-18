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
}));
jest.mock('../api', () => ({ api: { post: jest.fn(() => Promise.resolve({})), delete: jest.fn() } }));
jest.mock('../appVersion', () => ({ installedAppVersion: () => '1.5.5' }));
jest.mock('../sentry', () => ({ reportToSentry: jest.fn() }));
jest.mock('../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));
jest.mock('../../features/community/useCommunity', () => ({
  getCommunitySessionId: () => 'session-1',
  useTrackCommunityEvents: jest.fn(),
}));

import * as Notifications from 'expo-notifications';

import { api } from '../api';
import { registerForPushNotificationsAsync, routeForNotification } from '../push';

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
