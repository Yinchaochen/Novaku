import { ReactNode } from 'react';
import { Text, TextStyle, View, ViewStyle } from 'react-native';

import { colors } from '../theme/tokens';

type Tone = 'coral' | 'peach' | 'lavender' | 'sage' | 'neutral' | 'cream';

interface Props {
  label: string;
  tone?: Tone;
  size?: 'xs' | 'sm' | 'md';
  leadingIcon?: ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const TONE: Record<Tone, { bg: string; fg: string; border?: string }> = {
  coral: { bg: '#FFE8DA', fg: '#F28B6D', border: 'rgba(246, 118, 115, 0.18)' },
  peach: { bg: '#FFEFE0', fg: '#D78250', border: 'rgba(255, 170, 122, 0.20)' },
  lavender: { bg: '#EFE9FF', fg: '#6B5CD9', border: 'rgba(169, 155, 255, 0.20)' },
  sage: { bg: 'rgba(143, 188, 122, 0.18)', fg: '#5C8A48', border: 'rgba(143, 188, 122, 0.30)' },
  neutral: { bg: 'rgba(98, 57, 40, 0.06)', fg: colors.textMuted, border: colors.lineSoft },
  cream: { bg: '#FFF3E5', fg: colors.textBrown, border: colors.lineSofter },
};

const SIZE = {
  xs: { paddingV: 3, paddingH: 8, fontSize: 10, letterSpacing: 0.6 },
  sm: { paddingV: 4, paddingH: 10, fontSize: 11, letterSpacing: 0.8 },
  md: { paddingV: 6, paddingH: 12, fontSize: 12, letterSpacing: 0.6 },
} as const;

/**
 * Small uppercase tag pill. Used for SIDE / MAIN, ACTIVE, post-type, etc.
 * Soft tone-on-tone color, no harsh contrast.
 */
export function Pill({ label, tone = 'neutral', size = 'sm', leadingIcon, style, textStyle }: Props) {
  const t = TONE[tone];
  const s = SIZE[size];
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingVertical: s.paddingV,
          paddingHorizontal: s.paddingH,
          borderRadius: 999,
          backgroundColor: t.bg,
          borderWidth: t.border ? 1 : 0,
          borderColor: t.border,
        },
        style,
      ]}
    >
      {leadingIcon ?? null}
      <Text
        style={[
          {
            fontSize: s.fontSize,
            fontWeight: '700',
            color: t.fg,
            letterSpacing: s.letterSpacing,
            textTransform: 'uppercase',
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default Pill;
