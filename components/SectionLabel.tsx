import { Text, TextProps, View, ViewStyle } from 'react-native';

import { colors, typography } from '../theme/tokens';

interface Props extends Omit<TextProps, 'children'> {
  children: string;
  tone?: 'muted' | 'coral' | 'lavender';
  containerStyle?: ViewStyle;
  accent?: boolean; // small color block to the left
}

/**
 * Uppercase, letter-spaced overline used above hero blocks and section headers.
 * Matches the brief: "section label : 12-13px / uppercase / letter-spacing
 * 0.08em / muted brown".
 */
export function SectionLabel({ children, tone = 'muted', accent = true, containerStyle, style, ...rest }: Props) {
  const color =
    tone === 'coral' ? colors.brandCoral : tone === 'lavender' ? colors.lavender : colors.textMuted;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, containerStyle]}>
      {accent ? (
        <View
          style={{
            width: 18,
            height: 2,
            borderRadius: 999,
            backgroundColor: color,
            opacity: 0.55,
          }}
        />
      ) : null}
      <Text {...rest} style={[typography.overline, { color }, style]}>
        {children}
      </Text>
    </View>
  );
}

export default SectionLabel;
