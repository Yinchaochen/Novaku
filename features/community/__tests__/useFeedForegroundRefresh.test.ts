import {
  FEED_FOREGROUND_REFRESH_MS,
  firstPageOnly,
  shouldRefreshOnForeground,
} from '../useFeedForegroundRefresh';

const LONG_ENOUGH = FEED_FOREGROUND_REFRESH_MS;

describe('shouldRefreshOnForeground', () => {
  it('asks for a new feed session after a real absence', () => {
    expect(shouldRefreshOnForeground('background', 'active', 0, LONG_ENOUGH)).toBe(true);
    expect(shouldRefreshOnForeground('inactive', 'active', 0, LONG_ENOUGH)).toBe(true);
  });

  it('leaves a short glance alone', () => {
    // Checking a notification and coming straight back must not reshuffle the
    // feed under someone who is still reading it.
    expect(shouldRefreshOnForeground('background', 'active', 0, LONG_ENOUGH - 1)).toBe(false);
  });

  it('ignores transitions that are not a return to the foreground', () => {
    expect(shouldRefreshOnForeground('active', 'background', 0, LONG_ENOUGH)).toBe(false);
    expect(shouldRefreshOnForeground('active', 'inactive', 0, LONG_ENOUGH)).toBe(false);
    expect(shouldRefreshOnForeground('active', 'active', 0, LONG_ENOUGH)).toBe(false);
  });
});

describe('firstPageOnly', () => {
  it('drops later pages so one request rebuilds the list', () => {
    const data = { pages: [{ a: 1 }, { b: 2 }, { c: 3 }], pageParams: [null, 'c1', 'c2'] };

    expect(firstPageOnly(data)).toEqual({ pages: [{ a: 1 }], pageParams: [null] });
  });

  it('leaves a single-page cache untouched', () => {
    const data = { pages: [{ a: 1 }], pageParams: [null] };

    expect(firstPageOnly(data)).toBe(data);
  });

  it('survives an empty cache', () => {
    expect(firstPageOnly(undefined)).toBeUndefined();
  });
});
