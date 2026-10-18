import { coverPlan } from '../postCover';
import { bannerItems, bodyMayBeStale, cardTag, formatDeadline, placeLine } from '../postUpdates';

const NOW = new Date('2026-10-20T08:00:00Z');

describe('post source updates (D-171)', () => {
  it('tags a moved time for two weeks, a cancellation for good', () => {
    const recent = { info_update_kind: 'time', info_updated_at: '2026-10-15T08:00:00Z' };
    const old = { info_update_kind: 'time', info_updated_at: '2026-09-20T08:00:00Z' };
    expect(cardTag(recent, NOW)).toBe('time');
    expect(cardTag(old, NOW)).toBeNull();
    expect(cardTag({ info_update_kind: 'cancelled', info_updated_at: '2026-01-01T00:00:00Z' }, NOW)).toBe(
      'cancelled',
    );
    expect(cardTag({ info_update_kind: 'gone', info_updated_at: null }, NOW)).toBe('gone');
    expect(cardTag({ info_update_kind: 'something new', info_updated_at: '2026-10-19T08:00:00Z' }, NOW)).toBeNull();
    expect(cardTag({}, NOW)).toBeNull();
  });

  it('keeps the cover from lifting a dated sentence once the source moved it', () => {
    const post = {
      id: 'p1',
      post_type: 'guide',
      title: 'Founders breakfast',
      body:
        'Founders meet for breakfast and short pitches before work.\n\n' +
        'The next one is on Thursday 24 October at 19:00 at Factory, and it is free.\n\n' +
        'Bring a friend who is starting something.',
    };
    expect(coverPlan(post, post.title, post.body).keyLine).not.toBe('');
    const moved = { ...post, info_update_kind: 'time' };
    expect(bodyMayBeStale(moved)).toBe(true);
    expect(coverPlan(moved, moved.title, moved.body).keyLine).toBe('');
  });

  it('drops banner items of kinds this build does not know', () => {
    const items = bannerItems({
      info_updates: [
        { kind: 'time', at: null, before: {}, after: { starts_at: '2026-10-25T17:00:00Z' } },
        { kind: 'mystery' as never, at: null, before: {}, after: {} },
      ],
    });
    expect(items.map((item) => item.kind)).toEqual(['time']);
  });

  it('shows a whole-day deadline as a day, not as 01:59 the next morning', () => {
    for (const iso of ['2026-11-24T23:59:59+00:00', '2026-11-24T23:59:00+00:00']) {
      const text = formatDeadline(iso, 'en');
      expect(text).toMatch(/24/);
      expect(text).not.toMatch(/12:59|1:59|01:59/);
    }
  });

  it('still explains a cancellation the backend window has dropped', () => {
    const items = bannerItems({ info_update_kind: 'cancelled', info_updated_at: null, info_updates: [] });
    expect(items.map((item) => item.kind)).toEqual(['cancelled']);
  });

  it('writes a venue once', () => {
    expect(placeLine({ venue: 'Betahaus', address: 'Rudi-Dutschke-Str. 23, 10969 Berlin' })).toBe(
      'Betahaus, Rudi-Dutschke-Str. 23, 10969 Berlin',
    );
    expect(placeLine({ venue: 'Rudi-Dutschke-Str. 23', address: 'Rudi-Dutschke-Str. 23, 10969 Berlin' })).toBe(
      'Rudi-Dutschke-Str. 23',
    );
    expect(placeLine({ address: 'Lohmühlenstr. 65' })).toBe('Lohmühlenstr. 65');
  });
});
