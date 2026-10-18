import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createElement, type ReactNode } from 'react';

jest.mock('../../../context/LanguageContext', () => ({
  useLanguage: () => ({ langCode: 'en', t: {}, setLangCode: jest.fn() }),
}));

jest.mock('../../../lib/api', () => ({
  api: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('../../../lib/sentry', () => ({
  addSentryBreadcrumb: jest.fn(),
  reportToSentry: jest.fn(),
}));

import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { type AuthUser, useMe } from '../../auth/useAuth';
import { useUpdateDeadlinePush, useUpdateEventPush } from '../useSocial';

// The settings switches read the auth store. Each test mounts the real /me
// query next to the mutation and backs both with one fake server user, so the
// store has to end up with the server's value by whatever route the hook
// takes; an invalidation aimed at a key nothing uses leaves it stale.
let server: AuthUser;

function wrapperFor(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('push settings mutations keep the auth store in sync', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    server = {
      id: 'push-test-user',
      display_name: 'Push Tester',
      deadline_push_enabled: true,
      event_push_enabled: true,
      event_interests: [],
    } as unknown as AuthUser;
    useAuthStore.setState({ user: { ...server }, isAuthenticated: true });
    (api.get as jest.Mock).mockImplementation(async () => ({ data: { data: { ...server } } }));
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { gcTime: 0, retry: false },
        mutations: { gcTime: 0, retry: false },
      },
    });
  });

  afterEach(() => queryClient.clear());

  it('moves the deadline switch on the tap and keeps the server reply', async () => {
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => {
      answer = resolve;
    });
    (api.patch as jest.Mock).mockImplementation(async (_url: string, body: { enabled: boolean }) => {
      await answered;
      server = { ...server, deadline_push_enabled: body.enabled, display_name: 'From server' };
      return { data: { data: { ...server } } };
    });

    const { result, unmount } = await renderHook(
      () => ({ me: useMe(), toggle: useUpdateDeadlinePush() }),
      { wrapper: wrapperFor(queryClient) },
    );
    await waitFor(() => expect(result.current.me.isSuccess).toBe(true));

    await act(async () => {
      result.current.toggle.mutate(false);
    });
    expect(api.patch).toHaveBeenCalledWith('/auth/me/deadline-push', { enabled: false });
    expect(useAuthStore.getState().user?.deadline_push_enabled).toBe(false);

    await act(async () => answer());
    await waitFor(() => expect(result.current.toggle.isSuccess).toBe(true));
    await waitFor(() => expect(useAuthStore.getState().user).toEqual(server));
    expect(useAuthStore.getState().user?.deadline_push_enabled).toBe(false);
    unmount();
  });

  it('puts the deadline switch back when the request fails', async () => {
    (api.patch as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const { result, unmount } = await renderHook(
      () => ({ me: useMe(), toggle: useUpdateDeadlinePush() }),
      { wrapper: wrapperFor(queryClient) },
    );
    await waitFor(() => expect(result.current.me.isSuccess).toBe(true));

    await act(async () => {
      await expect(result.current.toggle.mutateAsync(false)).rejects.toThrow('offline');
    });

    expect(useAuthStore.getState().user?.deadline_push_enabled).toBe(true);
    unmount();
  });

  it('puts the event push reply into the store', async () => {
    (api.patch as jest.Mock).mockImplementation(
      async (_url: string, body: { enabled: boolean; interests: string[] }) => {
        server = { ...server, event_push_enabled: body.enabled, event_interests: body.interests };
        return { data: { data: { ...server } } };
      },
    );
    const { result, unmount } = await renderHook(
      () => ({ me: useMe(), update: useUpdateEventPush() }),
      { wrapper: wrapperFor(queryClient) },
    );
    await waitFor(() => expect(result.current.me.isSuccess).toBe(true));

    await act(async () => {
      await result.current.update.mutateAsync({ enabled: false, interests: ['founder'] });
    });

    await waitFor(() => expect(useAuthStore.getState().user).toEqual(server));
    expect(useAuthStore.getState().user?.event_push_enabled).toBe(false);
    expect(useAuthStore.getState().user?.event_interests).toEqual(['founder']);
    unmount();
  });
});
