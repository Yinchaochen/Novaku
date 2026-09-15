/**
 * Layout geometry — single source of truth for the floating tab bar.
 *
 * Why this file exists: the tab bar height (`64 + max(bottomInset, 12)`) was
 * copy-pasted into `app/(tabs)/_layout.tsx`, `app/(tabs)/tasks.tsx`, and guessed
 * as a hard-coded `paddingBottom: 130` in `app/(tabs)/profile.tsx`. Three copies
 * of one invariant = content silently sliding under the bar whenever one drifts.
 * Both the tab bar and any `<Screen tabBar>` now read from here.
 */

/** Tab bar body height, excluding the bottom safe-area inset. */
export const TAB_BAR_BASE_HEIGHT = 64;

/** Floor for the bottom inset so the bar never hugs the screen edge. */
export const TAB_BAR_MIN_BOTTOM = 12;

/** Total height the absolute tab bar occupies for the given bottom inset. */
export function getTabBarHeight(bottomInset: number): number {
  return TAB_BAR_BASE_HEIGHT + Math.max(bottomInset, TAB_BAR_MIN_BOTTOM);
}

/**
 * Where the bar stops being a bar and becomes a rail (2026-09-15).
 *
 * A row of five tabs pinned across the bottom of a 2000px browser window is a
 * phone control blown up to the width of a desk: the labels end up a hand's
 * width apart and the whole bottom strip is spent on five words. Every desktop
 * feed -- Xiaohongshu's included -- puts that navigation down the left instead,
 * where it costs one column and stays within reach of the eye.
 *
 * 900 rather than a tablet's 768: at 768 the rail would eat a quarter of the
 * usable width and the wall would drop to two columns, which is worse than the
 * bar it replaced.
 */
export const WIDE_LAYOUT_MIN_WIDTH = 900;

/** How much width the left rail takes when it is shown. */
export const TAB_RAIL_WIDTH = 116;
