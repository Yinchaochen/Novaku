/**
 * Whether the Plaza's floating Post button should be on screen right now.
 *
 * The button is 130x55 pinned over the middle of a two-column feed, so at rest
 * it covers part of a card's title and byline on every screen — which is what
 * a recording of the feed showed, over and over, on whichever card happened to
 * be under it. It slides away on the way down and comes back on the way up:
 * the reader is reading in one direction and composing in the other.
 *
 * Kept out of the screen as a pure function because the Plaza tab needs a
 * signed-in session against a live API, so this rule cannot be walked in a
 * browser — and a scroll rule that is only ever verified by hand is a scroll
 * rule that flickers on somebody's phone six weeks later.
 */

/** Movement below this is a finger resting on the glass, not a scroll. */
export const SCROLL_DEAD_BAND = 6;

/** Above the first screenful the button stays put; there is nothing to cover. */
export const HIDE_BELOW_OFFSET = 120;

export interface ComposeButtonScrollState {
  /** Where the list is now. */
  y: number;
  /** Where it was at the last decision. */
  lastY: number;
  /** Whether the button is currently hidden. */
  hidden: boolean;
  /** The walkthrough spotlights this button by measuring it on screen. */
  guideActive: boolean;
}

export interface ComposeButtonDecision {
  hidden: boolean;
  lastY: number;
}

export function nextComposeButtonState(
  state: ComposeButtonScrollState,
): ComposeButtonDecision {
  const { y, lastY, hidden, guideActive } = state;

  // The spotlight measures this button in window coordinates, so a hidden
  // button is a spotlight on empty screen. Checked before the dead band: a
  // walkthrough that starts mid-scroll must bring the button back even if the
  // list has since stopped moving.
  if (guideActive) {
    return { hidden: false, lastY: y };
  }

  const delta = y - lastY;
  if (Math.abs(delta) < SCROLL_DEAD_BAND) {
    return { hidden, lastY };
  }

  return { hidden: delta > 0 && y > HIDE_BELOW_OFFSET, lastY: y };
}
