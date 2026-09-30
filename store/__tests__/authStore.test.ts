/**
 * Signing out ends the session on screen first and with the server second.
 *
 * Profile navigates to the sign-in screen and then calls logout(). While the
 * store still said "signed in", the root guard treated that screen like a
 * finished sign-in and sent the user to the Plaza; they sat there until the
 * push-token and refresh-token calls came back, then got bounced to sign-in
 * again. On a slow network that was several seconds of the wrong screen.
 *
 * The two server calls are dynamic imports, which this jest setup cannot load
 * (no --experimental-vm-modules): inside logout() they throw and are caught,
 * as any failed call would be. So what is locked here is the order of the
 * local steps, not the requests.
 */

const mockSecure = new Map<string, string>();

jest.mock('../../lib/secureStore', () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecure.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecure.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecure.delete(key);
  }),
}));

jest.mock('../../lib/sentry', () => ({
  addSentryBreadcrumb: jest.fn(),
  reportToSentry: jest.fn(),
}));

import type { AuthUser } from '../../features/auth/useAuth';
import { useAuthStore } from '../authStore';

async function signIn(access: string, refresh: string) {
  await useAuthStore.getState().setTokens(access, refresh);
  useAuthStore.getState().setUser({ id: access } as AuthUser);
}

beforeEach(() => {
  mockSecure.clear();
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe('logout', () => {
  it('is signed out in the store before anything is awaited', async () => {
    await signIn('access-1', 'refresh-1');

    const done = useAuthStore.getState().logout();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    // The push DELETE authenticates with the access token, so the tokens
    // outlive the store flag.
    expect(mockSecure.get('access_token')).toBe('access-1');
    await done;
  });

  it('clears both tokens once it is done', async () => {
    await signIn('access-1', 'refresh-1');

    await useAuthStore.getState().logout();

    expect(mockSecure.has('access_token')).toBe(false);
    expect(mockSecure.has('refresh_token')).toBe(false);
  });

  it('leaves a sign-in that finished meanwhile alone', async () => {
    await signIn('access-1', 'refresh-1');

    const done = useAuthStore.getState().logout();
    await signIn('access-2', 'refresh-2');
    await done;

    expect(mockSecure.get('access_token')).toBe('access-2');
    expect(mockSecure.get('refresh_token')).toBe('refresh-2');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
