import {
  HIDE_BELOW_OFFSET,
  SCROLL_DEAD_BAND,
  nextComposeButtonState,
} from '../composeButtonVisibility';

const base = { y: 0, lastY: 0, hidden: false, guideActive: false };

describe('nextComposeButtonState', () => {
  it('leaves the button alone at the top of the feed', () => {
    const next = nextComposeButtonState({ ...base, y: 40, lastY: 0 });

    expect(next.hidden).toBe(false);
    expect(next.lastY).toBe(40);
  });

  it('hides the button once the reader is scrolling down through content', () => {
    const next = nextComposeButtonState({
      ...base,
      y: HIDE_BELOW_OFFSET + 100,
      lastY: HIDE_BELOW_OFFSET + 40,
    });

    expect(next.hidden).toBe(true);
  });

  it('brings it back the moment the reader scrolls up', () => {
    const next = nextComposeButtonState({
      ...base,
      hidden: true,
      y: 400,
      lastY: 500,
    });

    expect(next.hidden).toBe(false);
  });

  it('ignores movement small enough to be a finger resting on the glass', () => {
    const next = nextComposeButtonState({
      ...base,
      hidden: true,
      y: 500 + SCROLL_DEAD_BAND - 1,
      lastY: 500,
    });

    expect(next.hidden).toBe(true);
    // The reference point does not move either, or a slow drag would never
    // accumulate into a real scroll.
    expect(next.lastY).toBe(500);
  });

  it('a slow drag still adds up to a scroll', () => {
    let state = { ...base, y: 200, lastY: 200 };
    for (let step = 1; step <= 4; step += 1) {
      state = { ...state, y: 200 + step * 4, ...nextComposeButtonState({ ...state, y: 200 + step * 4 }) };
    }

    expect(state.hidden).toBe(true);
  });

  it('never hides the button while the walkthrough is spotlighting it', () => {
    const next = nextComposeButtonState({
      ...base,
      guideActive: true,
      hidden: true,
      y: 900,
      lastY: 200,
    });

    expect(next.hidden).toBe(false);
  });

  it('brings the button back for the walkthrough even when the list is still', () => {
    // Below the dead band on purpose: a tour started after a scroll stopped
    // must not have to wait for the next gesture.
    const next = nextComposeButtonState({
      ...base,
      guideActive: true,
      hidden: true,
      y: 900,
      lastY: 900,
    });

    expect(next.hidden).toBe(false);
  });
});
