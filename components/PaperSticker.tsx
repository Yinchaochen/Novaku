import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../theme/tokens';

// The ochre edge under a sticker on the yellow band, as thick as paper. Drawn as a
// layer rather than a shadow so it is the same line on iOS, Android and the web.
const STICKER_EDGE = '#C98F2C';

/**
 * A cream paper sticker with an ink outline, for buttons on the yellow header band
 * (user feedback 2026-11-26: the old 22%-white buttons could not be seen there).
 */
export function PaperSticker({
  width,
  height = 36,
  children,
  style,
}: {
  width?: number;
  height?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const radius = height / 2;
  return (
    <View style={[{ borderRadius: radius, backgroundColor: STICKER_EDGE, paddingBottom: 1.5 }, style]}>
      <View
        style={{
          width,
          height,
          minWidth: height,
          borderRadius: radius,
          backgroundColor: colors.bgCream,
          borderWidth: 1.6,
          borderColor: colors.textMain,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** Search drawn with the same marker weight as the handwritten "?" beside it. */
export function MarkerSearchIcon({ size = 20, color = colors.textMain }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.7 3.9c3.6-.1 6.5 2.8 6.4 6.4-.1 3.5-3 6.3-6.5 6.2-3.5-.1-6.2-3-6.1-6.4.1-3.3 2.8-6.1 6.2-6.2z"
        stroke={color}
        strokeWidth={2.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M15.6 15.7l4.7 4.8" stroke={color} strokeWidth={2.7} strokeLinecap="round" />
    </Svg>
  );
}
