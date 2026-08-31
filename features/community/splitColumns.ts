import type { CommunityPost } from './useCommunity';

// Two-column card layout for post grids inside a plain ScrollView (profile
// pages, the related rail). Media cards are visually taller, so they weigh
// more when balancing the columns.
export function splitColumns(posts: CommunityPost[]) {
  const left: CommunityPost[] = [];
  const right: CommunityPost[] = [];
  let leftWeight = 0;
  let rightWeight = 0;
  for (const post of posts) {
    const weight = post.media_items.length > 0 ? 3 : 2;
    if (leftWeight <= rightWeight) {
      left.push(post);
      leftWeight += weight;
    } else {
      right.push(post);
      rightWeight += weight;
    }
  }
  return { left, right };
}
