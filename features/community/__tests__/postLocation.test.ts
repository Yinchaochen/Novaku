/**
 * A post with a field missing must not take the Plaza down (2026-08-31).
 *
 * A production build in the store crashed with "Rendered more hooks than
 * during the previous render", pointing at CommunityPostDetailModal. There is
 * no conditional hook in that component — every hook is unconditional and sits
 * at the top. The mismatch came from derived state computed BETWEEN the hooks:
 * `post.action_candidates` was iterated and `post.author.city` was read, with
 * the optional chain stopping one level short.
 *
 * A TypeError there aborts the render after ~33 hooks and before the remaining
 * 7, so React's next render of the same fiber counts more hooks than the last
 * and throws — and THAT is what reaches the error boundary, the crash reporter
 * and the user. The real TypeError is discarded. The symptom names hooks; the
 * cause is a payload shape, which is why this test lives at the data layer.
 *
 * The types say none of these fields can be missing. The types describe what
 * the API promises; these tests describe what the screen survives.
 */

import { getLocationEntries, getSourceHost } from '../postLocation';
import type { CommunityPost } from '../useCommunity';

function post(overrides: Record<string, unknown> = {}): CommunityPost {
  return {
    id: 'post-1',
    city: 'Berlin',
    source_url: null,
    action_candidates: [],
    author: { id: 'author-1', display_name: 'Magdalena', city: 'Berlin' },
    ...overrides,
  } as unknown as CommunityPost;
}

describe('getLocationEntries survives an incomplete post', () => {
  it('does not throw when action_candidates is absent', () => {
    // `for (const c of undefined)` — "undefined is not iterable" — was the
    // throw with the widest reach, because it runs for every post.
    expect(() => getLocationEntries(post({ action_candidates: undefined }))).not.toThrow();
  });

  it('does not throw when the author is absent', () => {
    expect(() => getLocationEntries(post({ author: undefined }))).not.toThrow();
    expect(() =>
      getLocationEntries(post({ author: undefined, source_url: 'https://example.com/x' })),
    ).not.toThrow();
  });

  it('does not throw when a candidate carries no metadata', () => {
    const candidate = { id: 'c1', action_type: 'visit_place', entity_name: 'Tempelhof' };
    expect(() => getLocationEntries(post({ action_candidates: [candidate] }))).not.toThrow();
  });

  it('still returns the entry a complete post has', () => {
    const entries = getLocationEntries(
      post({
        action_candidates: [
          {
            id: 'c1',
            action_type: 'visit_place',
            entity_name: 'Tempelhofer Feld',
            source_url: 'https://example.com/tempelhof',
            metadata_json: { place_name: 'Tempelhofer Feld' },
          },
        ],
      }),
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].label).toBe('Tempelhofer Feld');
  });

  it('falls back to the city when there is only a source url', () => {
    const entries = getLocationEntries(post({ source_url: 'https://example.com/x' }));

    expect(entries).toHaveLength(1);
    expect(entries[0].label).toBe('Berlin');
  });

  it('returns nothing rather than a half-built entry when there is nothing to say', () => {
    expect(getLocationEntries(post({ city: null, author: undefined }))).toEqual([]);
  });
});

describe('getSourceHost', () => {
  it('strips www and keeps the host', () => {
    expect(getSourceHost('https://www.berlin.de/a/b')).toBe('berlin.de');
  });

  it('hands back anything it cannot parse instead of throwing', () => {
    expect(getSourceHost('not a url')).toBe('not a url');
    expect(getSourceHost(null)).toBeNull();
    expect(getSourceHost(undefined)).toBeNull();
  });
});
