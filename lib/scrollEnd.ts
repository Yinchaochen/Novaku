import type { NativeScrollEvent } from 'react-native';

// Start the next page about two rows of cards before the reader reaches the bottom.
const LOAD_AHEAD_PX = 600;

type ScrollMetrics = Pick<NativeScrollEvent, 'layoutMeasurement' | 'contentOffset' | 'contentSize'>;

export function isNearScrollEnd(
  { layoutMeasurement, contentOffset, contentSize }: ScrollMetrics,
  ahead = LOAD_AHEAD_PX,
): boolean {
  return layoutMeasurement.height + contentOffset.y >= contentSize.height - ahead;
}
