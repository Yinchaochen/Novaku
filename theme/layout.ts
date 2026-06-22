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
