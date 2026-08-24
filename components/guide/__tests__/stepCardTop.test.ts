/**
 * The step card must always be reachable (D-079).
 *
 * lisum filmed the Buddy tour stopping on its last step: the ring sat on the
 * + button, and there was no card — no Continue, no Skip, no way out. The
 * card was rendered the whole time, positioned below the tab bar.
 *
 * The cause was two coordinate spaces meeting in one comparison. `hole` is in
 * overlay coordinates; the bound it was measured against was the window
 * height. Those are the same number on web and iOS and differ on Android,
 * where the overlay gets a non-zero origin — so a target hugging the bottom
 * looked like it had room underneath, and the card went off screen. Every web
 * render of the same step was fine, which is why nothing caught it.
 *
 * These test the geometry directly, in one space, so the question "can the
 * reader still reach the buttons?" has an answer that does not depend on
 * which platform is rendering.
 */

import { stepCardTop } from '../SpotlightOverlay';

const SCREEN = 812;
const SAFE_TOP = 44;
const CARD = 180;
const visibleBottom = SCREEN - 8;

describe('stepCardTop', () => {
  it('sits under a target near the top', () => {
    const top = stepCardTop({
      hole: { y: 100, height: 40 },
      cardHeight: CARD,
      visibleBottom,
      safeTop: SAFE_TOP,
    });
    expect(top).toBeGreaterThan(140);
    expect(top + CARD).toBeLessThanOrEqual(visibleBottom);
  });

  it('flips above a target with no room beneath it', () => {
    const hole = { y: 700, height: 60 };
    const top = stepCardTop({ hole, cardHeight: CARD, visibleBottom, safeTop: SAFE_TOP });
    expect(top + CARD).toBeLessThanOrEqual(hole.y);
  });

  it('keeps the card on screen for a target pinned to the bottom edge', () => {
    // The Buddy tour's last step: the + button sits just above the tab bar.
    const top = stepCardTop({
      hole: { y: 735, height: 64 },
      cardHeight: CARD,
      visibleBottom,
      safeTop: SAFE_TOP,
    });
    expect(top).toBeGreaterThanOrEqual(SAFE_TOP);
    expect(top + CARD).toBeLessThanOrEqual(visibleBottom);
  });

  it('never places the card past the bottom, whatever the target', () => {
    // The property, not an example: no target anywhere on the screen may put
    // the card out of reach.
    for (let y = 0; y <= SCREEN; y += 17) {
      for (const h of [24, 64, 120]) {
        const top = stepCardTop({
          hole: { y, height: h },
          cardHeight: CARD,
          visibleBottom,
          safeTop: SAFE_TOP,
        });
        expect(top + CARD).toBeLessThanOrEqual(visibleBottom);
        expect(top).toBeGreaterThanOrEqual(SAFE_TOP);
      }
    }
  });

  it('centres the card when the target cannot be measured', () => {
    const top = stepCardTop({
      hole: null,
      cardHeight: CARD,
      visibleBottom,
      safeTop: SAFE_TOP,
    });
    expect(top).toBeGreaterThanOrEqual(SAFE_TOP);
    expect(top + CARD).toBeLessThanOrEqual(visibleBottom);
  });

  it('stays reachable on a short viewport, where nothing really fits', () => {
    // Keyboard open on a small phone. Something has to give; it must not be
    // the card's top edge, or the buttons go under the status bar.
    const cramped = 320;
    const top = stepCardTop({
      hole: { y: 250, height: 60 },
      cardHeight: CARD,
      visibleBottom: cramped,
      safeTop: SAFE_TOP,
    });
    expect(top).toBeGreaterThanOrEqual(SAFE_TOP);
  });

  it('places the card in the same space the hole was given in', () => {
    // The actual regression. Shifting the whole coordinate system — which is
    // what Android's overlay origin does — must shift the answer with it, not
    // change whether the card fits.
    const shift = 120;
    const flat = stepCardTop({
      hole: { y: 600, height: 64 },
      cardHeight: CARD,
      visibleBottom: 800,
      safeTop: 0,
    });
    const shifted = stepCardTop({
      hole: { y: 600 - shift, height: 64 },
      cardHeight: CARD,
      visibleBottom: 800 - shift,
      safeTop: 0,
    });
    expect(shifted).toBe(flat - shift);
  });
});
