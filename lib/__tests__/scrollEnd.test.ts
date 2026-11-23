import { isNearScrollEnd } from '../scrollEnd';

const at = (offsetY: number, contentHeight = 5000, viewportHeight = 800) => ({
  layoutMeasurement: { width: 390, height: viewportHeight },
  contentOffset: { x: 0, y: offsetY },
  contentSize: { width: 390, height: contentHeight },
});

describe('isNearScrollEnd', () => {
  it('is false at the top of a long page', () => {
    expect(isNearScrollEnd(at(0))).toBe(false);
  });

  it('turns true once the bottom is within the load-ahead distance', () => {
    expect(isNearScrollEnd(at(3599))).toBe(false);
    expect(isNearScrollEnd(at(3600))).toBe(true);
  });

  it('is true at the very bottom', () => {
    expect(isNearScrollEnd(at(4200))).toBe(true);
  });

  it('takes a different distance when given one', () => {
    expect(isNearScrollEnd(at(4000), 100)).toBe(false);
    expect(isNearScrollEnd(at(4100), 100)).toBe(true);
  });
});
