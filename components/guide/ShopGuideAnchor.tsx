import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { type ShopGuideStep, shopGuide } from '../../features/guide/shopGuide';

// collapsable={false}: Android would otherwise optimise the View away and it would never measure.
export function ShopGuideAnchor({
  step,
  style,
  children,
}: {
  step: ShopGuideStep;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const ref = shopGuide.useTarget(step);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
