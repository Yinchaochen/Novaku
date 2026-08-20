import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import { createElement, type ReactNode } from 'react';

const mockSetLangCode = jest.fn<Promise<void>, [string]>();

jest.mock('../../../context/LanguageContext', () => ({
  useLanguage: () => ({
    langCode: 'en',
    t: {},
    setLangCode: mockSetLangCode,
  }),
}));

jest.mock('../../../lib/api', () => ({
  api: {
    patch: jest.fn(),
  },
}));

jest.mock('../../../lib/sentry', () => ({
  addSentryBreadcrumb: jest.fn(),
  reportToSentry: jest.fn(),
}));

import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { useUpdateProfile, type AuthUser } from '../useAuth';

function userWithLocale(locale: string): AuthUser {
  return {
    id: 'locale-test-user',
    display_name: 'Locale Tester',
    locale,
  } as AuthUser;
}

function wrapperFor(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useUpdateProfile locale changes', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetLangCode.mockResolvedValue(undefined);
    useAuthStore.setState({ user: userWithLocale('en'), isAuthenticated: true });
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { gcTime: 0 },
        mutations: { gcTime: 0, retry: false },
      },
    });
  });

  afterEach(() => queryClient.clear());

  it('keeps the selected locale locally when server sync fails', async () => {
    (api.patch as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const { result, unmount } = await renderHook(() => useUpdateProfile(), {
      wrapper: wrapperFor(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync({ locale: 'de' })).rejects.toThrow('offline');
    });

    expect(mockSetLangCode).toHaveBeenCalledWith('de');
    expect(useAuthStore.getState().user?.locale).toBe('de');
    unmount();
  });

  it('still rolls back unrelated profile fields when server sync fails', async () => {
    (api.patch as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const { result, unmount } = await renderHook(() => useUpdateProfile(), {
      wrapper: wrapperFor(queryClient),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ display_name: 'Unsynced name' }),
      ).rejects.toThrow('offline');
    });

    expect(mockSetLangCode).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user?.display_name).toBe('Locale Tester');
    unmount();
  });
});
