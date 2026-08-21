import {
  MAX_CARD_ASPECT,
  MAX_DETAIL_ASPECT,
  MIN_CARD_ASPECT,
  MIN_DETAIL_ASPECT,
  clampAspect,
  detailMediaHeight,
} from '../cardAspect';

// Event posters are wide and full of words. Cropping one into the card's
// portrait box cut the text in half and the reader had to open the post to
// find out what it said — the bug these pin.

describe('clampAspect', () => {
  it('keeps a wide event poster wide instead of cropping it to portrait', () => {
    // A 2:1 Luma cover kept its shape rather than being cut to ~0.7.
    expect(clampAspect(1200, 600)).toBeCloseTo(1.9, 5);
    expect(clampAspect(1000, 700)).toBeCloseTo(1000 / 700, 5);
  });

  it('passes ordinary photos through untouched', () => {
    expect(clampAspect(1024, 681)).toBeCloseTo(1024 / 681, 5);
    expect(clampAspect(800, 800)).toBeCloseTo(1, 5);
  });

  it('clamps a banner so it cannot become a sliver', () => {
    // 5:1 would be ~34px tall in a 170px column.
    expect(clampAspect(2000, 400)).toBeCloseTo(1.9, 5);
  });

  it('clamps a very tall image so it cannot push the next card off-screen', () => {
    expect(clampAspect(600, 1600)).toBeCloseTo(0.72, 5);
  });

  it('returns null for sizes it cannot use, so the card keeps its placeholder', () => {
    expect(clampAspect(0, 100)).toBeNull();
    expect(clampAspect(100, 0)).toBeNull();
    expect(clampAspect(Number.NaN, 100)).toBeNull();
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
