import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createElement, type ReactNode } from 'react';

jest.mock('../../../context/LanguageContext', () => ({
  useLanguage: () => ({ langCode: 'en', t: {}, setLangCode: jest.fn() }),
}));

jest.mock('../../../lib/api', () => ({
  api: { get: jest.fn() },
}));

jest.mock('../../../lib/sentry', () => ({
  addSentryBreadcrumb: jest.fn(),
  reportToSentry: jest.fn(),
}));

// lib/queryClient reaches AsyncStorage through the persister, which has no
// native module under jest. Only the retry policy is used here.
jest.mock('../../../lib/queryClient', () => ({
  retryReads: () => false,
}));

jest.mock('../../../store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: { id: 'reader-1', city: 'berlin', identity: 'newcomer', intent_tags: [] } }),
}));

// The foreground listener is a separate concern with its own tests; stubbing it
// keeps AppState out of this one. firstPageOnly stays real — the fix uses it.
jest.mock('../useFeedForegroundRefresh', () => ({
  ...jest.requireActual('../useFeedForegroundRefresh'),
  useFeedForegroundRefresh: jest.fn(),
}));

import { api } from '../../../lib/api';
import { useCommunityFeed, useRefreshCommunityFeed } from '../useCommunity';

const mockedGet = api.get as jest.Mock;

function feedResponse(cursor: string | null, round = 0) {
  return {
    data: {
      data: {
        items: [{ id: `post-${cursor ?? 'first'}` }],
        next_cursor: cursor,
        local_pool_empty: false,
        unseen_on_page: 1,
        feed_round: round,
      },
    },
  };
}

function wrapperFor(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

async function renderFeed(queryClient: QueryClient) {
  return renderHook(() => ({ feed: useCommunityFeed(), refresh: useRefreshCommunityFeed() }), {
    wrapper: wrapperFor(queryClient),
  });
}

describe('useRefreshCommunityFeed', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockedGet.mockReset();
    // Each page must hand back a distinct cursor: react-query refuses to fetch
    // a next page whose param equals the current one, so a constant cursor
    // would silently leave the cache one page deep and prove nothing.
    let served = 0;
    mockedGet.mockImplementation(() => Promise.resolve(feedResponse(`cursor-${++served}`)));
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('costs one request no matter how far the reader has scrolled', async () => {
    // The regression: pull-to-refresh called the query's own refetch(), which
    // refetches every loaded page in sequence. Since the feed stopped having an
    // end, "how many pages are loaded" is unbounded, so the spinner sat there
    // through N round-trips and refresh looked broken.
    const { result } = await renderFeed(queryClient);
    await waitFor(() => expect(result.current.feed.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.feed.isFetching).toBe(false));

    await act(async () => {
      await result.current.feed.fetchNextPage();
    });
    await act(async () => {
      await result.current.feed.fetchNextPage();
    });
    await waitFor(() => expect(result.current.feed.data?.pages).toHaveLength(3));

    mockedGet.mockClear();
    await act(async () => {
      await result.current.refresh();
    });

    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('is needed because the query own refetch replays every loaded page', async () => {
    // The assumption the fix rests on, made executable. If react-query ever
    // stops refetching all pages, this fails and tells us the workaround can go.
    const { result } = await renderFeed(queryClient);
    await waitFor(() => expect(result.current.feed.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.feed.isFetching).toBe(false));
    await act(async () => {
      await result.current.feed.fetchNextPage();
    });
    await act(async () => {
      await result.current.feed.fetchNextPage();
    });

    mockedGet.mockClear();
    await act(async () => {
      await result.current.feed.refetch();
    });

    expect(mockedGet).toHaveBeenCalledTimes(3);
  });

  it('asks the backend for a new session instead of replaying the old one', async () => {
    // Page 1 is fetched with no cursor, which is what makes the backend build a
    // fresh snapshot (new feed_request_id -> new variety seed -> new order).
    // Refetching page 3 would replay a snapshot the previous session froze.
    const { result } = await renderFeed(queryClient);
    await waitFor(() => expect(result.current.feed.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.feed.isFetching).toBe(false));
    await act(async () => {
      await result.current.feed.fetchNextPage();
    });

    mockedGet.mockClear();
    await act(async () => {
      await result.current.refresh();
    });

    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet.mock.calls[0][1].params.cursor).toBeUndefined();
  });

  it('leaves the reader on a one-page list, not a stitched one', async () => {
    const { result } = await renderFeed(queryClient);
    await waitFor(() => expect(result.current.feed.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.feed.isFetching).toBe(false));
    await act(async () => {
      await result.current.feed.fetchNextPage();
    });
    await act(async () => {
      await result.current.feed.fetchNextPage();
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.feed.data?.pages).toHaveLength(1));
  });
});
