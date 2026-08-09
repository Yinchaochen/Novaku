import { measureGuideTarget, measureNode, toOverlayRect } from '../guideTargets';

const node = (x: number, y: number, width: number, height: number) => ({
  measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => cb(x, y, width, height),
});

describe('toOverlayRect', () => {
  const target = { x: 115, y: 620, width: 130, height: 55 };

  it('cancels the Android status-bar offset baked into measureInWindow', () => {
    // Android: both the target and the overlay come back shifted up by the
    // status bar, so the difference is the true overlay-local position.
    expect(toOverlayRect(target, { x: 0, y: -48, width: 393, height: 852 })).toEqual({
      x: 115,
      y: 668,
      width: 130,
      height: 55,
    });
  });

  it('leaves iOS window coords untouched', () => {
    expect(toOverlayRect(target, { x: 0, y: 0, width: 393, height: 852 })).toEqual(target);
  });

  it('falls back to raw window coords when the overlay is not measurable yet', () => {
    expect(toOverlayRect(target, null)).toEqual(target);
  });
});

describe('measureNode', () => {
  it('resolves null for a missing node', async () => {
    await expect(measureNode(null)).resolves.toBeNull();
  });

  it('resolves null for a degenerate rect', async () => {
    await expect(measureNode(node(10, 20, 0, 0))).resolves.toBeNull();
  });

  it('resolves the measured rect', async () => {
    await expect(measureNode(node(10, 20, 30, 40))).resolves.toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });

  it('resolves null for an unregistered step', async () => {
    await expect(measureGuideTarget('publish')).resolves.toBeNull();
  });
});
