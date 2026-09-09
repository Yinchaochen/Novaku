import { withSeedFeedContext } from '../postDetailSeed';
import type { CommunityPost, CommunityRecommendationFeedContext } from '../useCommunity';

const feedContext = { feed_request_id: 'req-1' } as CommunityRecommendationFeedContext;

function post(overrides: Partial<CommunityPost>): CommunityPost {
  return { id: 'p1', title: 'Theater that doesn’t play it safe', ...overrides } as CommunityPost;
}

describe('withSeedFeedContext', () => {
  it('renders the seed until the fetched copy arrives', () => {
    const seed = post({ feed_context: feedContext });
    expect(withSeedFeedContext(undefined, seed)).toBe(seed);
  });

  // The filmed bug: the fetched copy has no feed_context, so detailKey flipped
  // from "p1:req-1" to "p1:standalone" and the layout reset ran mid-open.
  it('keeps the feed the seed was served from when the fetched copy has none', () => {
    const seed = post({ feed_context: feedContext });
    const fetched = post({ feed_context: null, comment_count: 3 });
    const shown = withSeedFeedContext(fetched, seed);
    expect(shown?.feed_context).toBe(feedContext);
    expect(shown?.comment_count).toBe(3);
  });

  it('prefers the fetched copy’s own feed_context when it has one', () => {
    const own = { feed_request_id: 'req-2' } as CommunityRecommendationFeedContext;
    const shown = withSeedFeedContext(post({ feed_context: own }), post({ feed_context: feedContext }));
    expect(shown?.feed_context).toBe(own);
  });

  it('never borrows context across different posts', () => {
    const fetched = post({ id: 'p2', feed_context: null });
    expect(withSeedFeedContext(fetched, post({ feed_context: feedContext }))).toBe(fetched);
  });

  it('returns the fetched object itself when there is nothing to add', () => {
    const fetched = post({ feed_context: null });
    expect(withSeedFeedContext(fetched, post({ feed_context: null }))).toBe(fetched);
  });
});
