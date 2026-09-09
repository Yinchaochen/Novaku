import type { CommunityPost } from './useCommunity';

// `GET /community/posts/{id}` serves a post on its own and never carries
// feed_context; the seed the reader tapped does. Dropping it on the swap
// changed detailKey mid-open, which reset the measured media height (the
// bounce lisum filmed on 2026-09-07) and logged a second, unattributed open.
export function withSeedFeedContext(
  fetched: CommunityPost | undefined,
  seed: CommunityPost | null,
): CommunityPost | null {
  if (!fetched) return seed;
  if (fetched.feed_context || !seed?.feed_context || seed.id !== fetched.id) return fetched;
  return { ...fetched, feed_context: seed.feed_context };
}
