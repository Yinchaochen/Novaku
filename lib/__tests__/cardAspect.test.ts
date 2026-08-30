import {
  MAX_CARD_ASPECT,
  MAX_DETAIL_ASPECT,
  MIN_CARD_ASPECT,
  MIN_DETAIL_ASPECT,
  cardAspectFor,
  cardMediaFit,
  clampAspect,
  detailMediaHeight,
} from '../cardAspect';

// Event posters are wide and full of words. Cropping one into the card's
// portrait box cut the text in half and the reader had to open the post to
// find out what it said. That promise is still kept — but by `contain` now
// rather than by a wide slot, because the width of the slot was what made the
// feed's density unpredictable (2026-08-29 density work).

describe('clampAspect', () => {
  it('passes an ordinary portrait photo through untouched', () => {
    expect(clampAspect(800, 1000)).toBeCloseTo(0.8, 5);
    expect(clampAspect(900, 1000)).toBeCloseTo(0.9, 5);
  });

  it('clamps a very tall image so it cannot push the next card off-screen', () => {
    expect(clampAspect(600, 1600)).toBeCloseTo(MIN_CARD_ASPECT, 5);
  });

  it('clamps anything wider than square down to the square slot', () => {
    expect(clampAspect(2000, 400)).toBeCloseTo(MAX_CARD_ASPECT, 5);
    expect(clampAspect(1200, 600)).toBeCloseTo(MAX_CARD_ASPECT, 5);
  });

  it('returns null for sizes it cannot use, so the card keeps its placeholder', () => {
    expect(clampAspect(0, 100)).toBeNull();
    expect(clampAspect(100, 0)).toBeNull();
    expect(clampAspect(Number.NaN, 100)).toBeNull();
  });
});

describe('cardMediaFit', () => {
  it('still refuses to cut an event poster in half — it letterboxes instead', () => {
    // A 2:1 Luma cover. The slot stays tall so the feed keeps its rhythm, and
    // the poster keeps every word it had.
    const wide = cardMediaFit({ width: 1200, height: 600 }, 'post-1');
    expect(wide.fit).toBe('contain');
    expect(wide.aspect).toBeCloseTo(MAX_CARD_ASPECT, 5);

    const banner = cardMediaFit({ width: 2000, height: 400 }, 'post-2');
    expect(banner.fit).toBe('contain');

    // The generated event card is 1200x630 — 1.90, and the reason this branch
    // has to keep existing.
    expect(cardMediaFit({ width: 1200, height: 630 }, 'post-3').fit).toBe('contain');
  });

  it('crops an ordinary landscape photograph instead of matting it', () => {
    // Measured off the real seeded covers by the dimension backfill: 1280x851,
    // 1280x853, 1280x960 — 1.50, 1.50, 1.33. Every one an ordinary photograph
    // of a building. An earlier version matted anything wider than the slot,
    // which would have put paper bands around most of the feed to protect the
    // minority of pictures that are actually posters.
    for (const [width, height] of [[1280, 851], [1280, 853], [1280, 960], [1024, 681]]) {
      const fit = cardMediaFit({ width, height }, 'photo');
      expect(fit.fit).toBe('cover');
      expect(fit.aspect).toBeLessThanOrEqual(MAX_CARD_ASPECT);
    }
  });

  it('fills the slot with a photograph, where trimming costs nothing', () => {
    const portrait = cardMediaFit({ width: 800, height: 1000 }, 'post-3');
    expect(portrait.fit).toBe('cover');
    expect(portrait.aspect).toBeCloseTo(0.8, 5);

    const tower = cardMediaFit({ width: 600, height: 1600 }, 'post-4');
    expect(tower.fit).toBe('cover');
    expect(tower.aspect).toBeCloseTo(MIN_CARD_ASPECT, 5);
  });

  it('falls back to the stable per-post ratio when the size is unknown', () => {
    // Every post created so far is in this branch — see the width/height gap
    // reported alongside this change.
    const guessed = cardMediaFit(undefined, 'abc');
    expect(guessed.fit).toBe('cover');
    expect(guessed.aspect).toBe(cardAspectFor(undefined, 'abc'));
  });

  it('keeps the pitch of the feed inside a narrow band', () => {
    // The point of the whole exercise: card height must be predictable. Every
    // reachable slot sits between these two, a 25% spread rather than the
    // 164% the old 0.72-1.9 window allowed.
    const ratios = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => cardAspectFor(undefined, id));
    for (const r of ratios) {
      expect(r).toBeGreaterThanOrEqual(MIN_CARD_ASPECT);
      expect(r).toBeLessThanOrEqual(MAX_CARD_ASPECT);
    }
    expect(Math.max(...ratios) / Math.min(...ratios)).toBeLessThan(1.3);
  });
});

describe('detailMediaHeight', () => {
  const W = 400;
  const H = 800;

  it('follows a portrait poster instead of a fixed frame', () => {
    // 1080x1350 poster on a tall screen: the old frame was min(W*1.02, 440)
    // and cropped it. 400 / 0.8 = 500, under the 62% cap of a 1000pt screen.
    expect(detailMediaHeight(1080, 1350, W, 1000)).toBe(500);
  });

  it('the viewport cap wins over the image on a short screen', () => {
    expect(detailMediaHeight(1080, 1350, W, H)).toBe(Math.round(H * 0.62));
  });

  it('keeps a wide banner short', () => {
    expect(detailMediaHeight(2000, 1000, W, H)).toBe(200);
  });

  it('never lets one image fill the screen', () => {
    // A 1:3 tower clamps to MIN_DETAIL_ASPECT, then to 62% of the viewport.
    expect(detailMediaHeight(500, 1500, W, H)).toBe(Math.round(H * 0.62));
  });

  it('is more permissive than the card bounds', () => {
    expect(MIN_DETAIL_ASPECT).toBeLessThan(MIN_CARD_ASPECT);
    expect(MAX_DETAIL_ASPECT).toBeGreaterThan(MAX_CARD_ASPECT);
  });

  it('rejects unusable sizes rather than guessing', () => {
    expect(detailMediaHeight(0, 100, W, H)).toBeNull();
    expect(detailMediaHeight(100, 100, 0, H)).toBeNull();
    expect(detailMediaHeight(NaN, 100, W, H)).toBeNull();
  });
});
