/**
 * How wide the Plaza's masonry wall is, and how many columns it is cut into.
 *
 * Two columns is a phone measurement. The same two columns on a 2000px browser
 * window gave each card a thousand pixels of width: the cover grew to the size
 * of a poster, the title sat alone on one line, and a screen that holds ten
 * posts on a phone held three. lisum filmed it on 2026-09-15 and the complaint
 * was not that it was ugly but that you could not see anything.
 *
 * So the column count follows the width instead of being a constant. The first
 * attempt aimed at 280px columns and six of them, which fixed the emptiness
 * and produced the opposite complaint the same afternoon: 信息密度太大 — about
 * twenty cards on a screen, each too small to place at a glance. The target is
 * now a card you can read from across the desk, and the number that decides it
 * is not the column width but **how many posts land on one screen**: lisum
 * asked for ten, and ten is what ~340px columns give on a 1080p window once
 * the cover, the title and the byline are counted.
 *
 * Wider than MAX_CONTENT the wall stops growing and centres, because a sixth
 * column added at 2500px would be read by nobody — the reader's eyes are in
 * the middle of the screen.
 *
 * Nothing changes on a phone: every width below ~850 still resolves to 2.
 */

/** The width one column aims for, gutters included. */
const TARGET_COLUMN = 340;

export const MIN_COLUMNS = 2;
export const MAX_COLUMNS = 5;

/** The wall stops here and centres: MAX_COLUMNS at TARGET_COLUMN. */
export const MAX_CONTENT_WIDTH = MAX_COLUMNS * TARGET_COLUMN;

/** The gutter at the wall's own edge, and half of it between columns. */
const EDGE_PADDING = 6;

export interface FeedGrid {
  columns: number;
  /** Horizontal padding that both keeps the edge gutter and centres the wall. */
  sidePadding: number;
  /** What one card will actually be given, so it can size its own type. */
  columnWidth: number;
}

/**
 * @param wallWidth width of the list itself, not of the window — on a wide
 * screen the tab rail has already taken its share (see theme/layout.ts).
 */
export function feedGrid(wallWidth: number): FeedGrid {
  if (!Number.isFinite(wallWidth) || wallWidth <= 0) {
    return { columns: MIN_COLUMNS, sidePadding: EDGE_PADDING, columnWidth: 0 };
  }
  const content = Math.min(wallWidth, MAX_CONTENT_WIDTH);
  const columns = Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, Math.round(content / TARGET_COLUMN)));
  const margin = Math.max(0, (wallWidth - content) / 2);
  const sidePadding = Math.round(margin) + EDGE_PADDING;
  return {
    columns,
    sidePadding,
    columnWidth: Math.floor((wallWidth - sidePadding * 2) / columns),
  };
}
