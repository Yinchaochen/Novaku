import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { type SocialGuideStep, useSocialGuideTarget } from '../../features/guide/socialGuide';

// Wraps a real control so the Social walkthrough can measure and highlight it.
// collapsable={false} keeps the View in the native tree on Android, where an
// otherwise layout-only View would be optimised away and never measure.
export function SocialGuideAnchor({
  step,
  style,
  children,
}: {
  step: SocialGuideStep;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const ref = useSocialGuideTarget(step);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
