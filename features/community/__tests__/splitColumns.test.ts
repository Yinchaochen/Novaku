import { splitColumns } from '../splitColumns';
import type { CommunityPost } from '../useCommunity';

function post(id: string, mediaCount: number): CommunityPost {
  return { id, media_items: Array.from({ length: mediaCount }, (_, i) => ({ id: `${id}-m${i}` })) } as unknown as CommunityPost;
}

describe('splitColumns', () => {
  it('keeps every post exactly once across the two columns', () => {
    const posts = [post('a', 0), post('b', 1), post('c', 0), post('d', 2), post('e', 0)];
    const { left, right } = splitColumns(posts);
    const ids = [...left, ...right].map((p) => p.id).sort();
    expect(ids).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('balances by weight: media cards count heavier than text cards', () => {
    // One media card (3) vs three text cards (2+2+2): the media card's column
    // must not also receive the last text card.
    const posts = [post('img', 1), post('t1', 0), post('t2', 0), post('t3', 0)];
    const { left, right } = splitColumns(posts);
    expect(left.map((p) => p.id)).toEqual(['img', 't3']);
    expect(right.map((p) => p.id)).toEqual(['t1', 't2']);
  });

  it('handles the empty rail', () => {
    expect(splitColumns([])).toEqual({ left: [], right: [] });
  });
});
