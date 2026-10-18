import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import { createElement, type ReactNode } from 'react';

jest.mock('../../../lib/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import type { AuthUser } from '../../auth/useAuth';
import { useSetAccountVerified } from '../useVerifiedAccounts';

const me = { id: 'staff-user', display_name: 'Staff', is_verified: false } as unknown as AuthUser;

function reply(id: string) {
  return {
    data: {
      data: { id, display_id: '1234567890', display_name: 'Someone', is_verified: true, verified_at: null },
    },
  };
}

describe('useSetAccountVerified', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: { ...me }, isAuthenticated: true });
    queryClient = new QueryClient({ defaultOptions: { mutations: { gcTime: 0, retry: false } } });
  });

  afterEach(() => queryClient.clear());

  function mount() {
    return renderHook(() => useSetAccountVerified(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children),
    });
  }

  it('updates the signed-in user when staff badge their own account', async () => {
    (api.post as jest.Mock).mockResolvedValueOnce(reply(me.id));
    const { result, unmount } = await mount();

    await act(async () => {
      await result.current.mutateAsync({ userId: me.id, verified: true });
    });

    expect(useAuthStore.getState().user).toEqual({ ...me, is_verified: true });
    unmount();
  });

  it('leaves the signed-in user alone when the badge goes to someone else', async () => {
    (api.post as jest.Mock).mockResolvedValueOnce(reply('other-user'));
    const { result, unmount } = await mount();

    await act(async () => {
      await result.current.mutateAsync({ userId: 'other-user', verified: true });
    });

    expect(useAuthStore.getState().user).toEqual(me);
    unmount();
  });
});
