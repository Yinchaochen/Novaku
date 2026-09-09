import { renderHook } from '@testing-library/react-native';

jest.mock('../useCommunity', () => ({ getCommunitySessionId: () => 'session-1' }));

import type {
  CommunityRecommendationContentContext,
  CommunityRecommendationFeedContext,
} from '../useCommunity';
import { useDetailDwellTracking } from '../useDetailDwellTracking';

type HookArgs = Parameters<typeof useDetailDwellTracking>[0];

const feed = { feed_request_id: 'req-1' } as CommunityRecommendationFeedContext;

function args(overrides: Partial<HookArgs> = {}) {
  return {
    visible: true,
    detailKey: 'p1:req-1',
    postId: 'p1',
    surface: 'plaza_detail' as const,
    feedContext: feed,
    contentContext: null,
    track: jest.fn(),
    ...overrides,
  };
}

let now = 1_000;
beforeEach(() => {
  now = 1_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('useDetailDwellTracking', () => {
  it('opens once and stays quiet while the same post refetches', async () => {
    const track = jest.fn();
    const { rerender } = await renderHook((props: HookArgs) => useDetailDwellTracking(props), {
      initialProps: args({ track }),
    });
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenLastCalledWith([
      expect.objectContaining({ event_name: 'plaza_open_post', post_id: 'p1', feed_context: feed, surface: 'plaza_detail' }),
    ]);

    // A like or a comment refetches the post: new object, new content_context,
    // same detailKey. Before the fix this sent a 300ms dwell and a second open.
    const richer = { post_type: 'guide' } as CommunityRecommendationContentContext;
    await rerender(args({ track, contentContext: richer }));
    await rerender(args({ track, contentContext: richer }));
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('reports one dwell, with the downstream flag, when the post closes', async () => {
    const track = jest.fn();
    const richer = { post_type: 'guide' } as CommunityRecommendationContentContext;
    const { result, rerender } = await renderHook((props: HookArgs) => useDetailDwellTracking(props), {
      initialProps: args({ track }),
    });
    await rerender(args({ track, contentContext: richer }));
    result.current.markDownstreamSignal();
    now = 5_000;
    await rerender(args({ track, contentContext: richer, visible: false }));

    expect(track).toHaveBeenCalledTimes(2);
    expect(track).toHaveBeenLastCalledWith([
      expect.objectContaining({
        event_name: 'plaza_dwell',
        post_id: 'p1',
        feed_context: feed,
        content_context: richer,
        dwell_ms: 4_000,
        had_downstream_signal_in_session: true,
      }),
    ]);
  });

  it('closes the old post and opens the new one when the key changes', async () => {
    const track = jest.fn();
    const { rerender } = await renderHook((props: HookArgs) => useDetailDwellTracking(props), {
      initialProps: args({ track }),
    });
    now = 3_500;
    await rerender(args({ track, detailKey: 'p2:standalone', postId: 'p2', feedContext: null, surface: 'plaza_related' }));

    expect(track.mock.calls.map((call) => call[0][0])).toEqual([
      expect.objectContaining({ event_name: 'plaza_open_post', post_id: 'p1' }),
      expect.objectContaining({ event_name: 'plaza_dwell', post_id: 'p1', feed_context: feed, surface: 'plaza_detail', dwell_ms: 2_500, had_downstream_signal_in_session: false }),
      expect.objectContaining({ event_name: 'plaza_open_post', post_id: 'p2', surface: 'plaza_related' }),
    ]);
  });

  it('does nothing while hidden or without a post', async () => {
    const track = jest.fn();
    const { rerender } = await renderHook((props: HookArgs) => useDetailDwellTracking(props), {
      initialProps: args({ track, visible: false }),
    });
    await rerender(args({ track, detailKey: null, postId: null }));
    expect(track).not.toHaveBeenCalled();
  });
});
