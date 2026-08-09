import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { type BuddyGuideStep, useBuddyGuideTarget } from '../../features/guide/buddyGuide';

// Wraps a real control so the Buddy walkthrough can measure and highlight it.
// collapsable={false} keeps the View in the native tree on Android, where an
// otherwise layout-only View would be optimised away and never measure.
export function BuddyGuideAnchor({
  step,
  style,
  children,
}: {
  step: BuddyGuideStep;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const ref = useBuddyGuideTarget(step);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
