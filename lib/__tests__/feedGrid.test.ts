/**
 * The phone must not notice this exists, and the browser must.
 *
 * The regression this guards is the one lisum filmed on 2026-09-15: two
 * columns is correct on a 390px phone and absurd on a 2000px window, where it
 * gave each card ~1000px and put three posts on a screen.
 */

import { feedGrid, MAX_COLUMNS, MAX_CONTENT_WIDTH, MIN_COLUMNS } from '../feedGrid';

describe('feedGrid', () => {
  it.each([320, 360, 390, 430, 500, 600, 768])(
    'keeps a phone and a portrait tablet at two columns (%ipx)',
    (width) => {
      expect(feedGrid(width).columns).toBe(MIN_COLUMNS);
    },
  );

  it('grows a column at a time on a laptop and a desktop', () => {
    expect(feedGrid(1024).columns).toBe(3);
    expect(feedGrid(1324).columns).toBe(4);
    expect(feedGrid(1884).columns).toBe(5);
  });

  it('stops adding columns past the cap', () => {
    expect(feedGrid(MAX_CONTENT_WIDTH).columns).toBe(MAX_COLUMNS);
    expect(feedGrid(2560).columns).toBe(MAX_COLUMNS);
    expect(feedGrid(5000).columns).toBe(MAX_COLUMNS);
  });

  it('keeps a card big enough to read at every width it chooses', () => {
    // The complaint this replaced was density, so the floor is the point:
    // no width may resolve to columns so narrow the cover stops carrying.
    for (const width of [900, 1024, 1200, 1324, 1440, 1600, 1884, 2200, 2560]) {
      expect(feedGrid(width).columnWidth).toBeGreaterThanOrEqual(280);
    }
  });

  it('centres the wall once it stops growing, and not before', () => {
    // Narrower than the cap: the edge gutter only.
    expect(feedGrid(1200).sidePadding).toBe(6);
    // Wider: half the surplus on each side.
    const wide = feedGrid(MAX_CONTENT_WIDTH + 400);
    expect(wide.sidePadding).toBe(206);
  });

  it('never returns a column count a list cannot render', () => {
    for (const width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const grid = feedGrid(width);
      expect(grid.columns).toBeGreaterThanOrEqual(MIN_COLUMNS);
      expect(grid.columns).toBeLessThanOrEqual(MAX_COLUMNS);
      expect(grid.sidePadding).toBeGreaterThanOrEqual(0);
    }
  });
});
