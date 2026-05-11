import { forwardRef, ReactNode } from 'react';
import { Pressable, PressableProps, View, ViewProps, ViewStyle } from 'react-native';

import { radius, shadows } from '../theme/tokens';

type Tone = 'white' | 'cream' | 'lavender' | 'solid';

interface GlassCardProps extends Omit<ViewProps, 'children'> {
  children?: ReactNode;
  tone?: Tone;
  radiusKey?: keyof typeof radius;
  padding?: number;
  shadow?: keyof typeof shadows | 'none';
  elevated?: boolean;
}

interface PressableGlassCardProps extends Omit<PressableProps, 'children' | 'style'> {
  children?: ReactNode;
  tone?: Tone;
  radiusKey?: keyof typeof radius;
  padding?: number;
  shadow?: keyof typeof shadows | 'none';
  style?: ViewStyle;
}

/**
 * Postervia GlassCard — YumQuick-flavour solid card.
 *
 * 2026-05-09 simplification: stripped LinearGradient + BlurView + top-edge
 * highlight strip + 1px white border. The earlier "frosted glass" stack
 * looked great in screenshots but created the recurring "white block in the
 * middle of cream" perception on Android: a semi-transparent white-ish
 * gradient sitting on a warm cream page just reads as "almost-white panel
 * over almost-white background", and the eye picks the brighter card body
 * out as a hard rectangle.
 *
 * Solid white on solid cream gives clean card ↔ page separation, matches
 * the YumQuick reference look, and is dramatically simpler.
 *
 * The `tone` prop is preserved for API compatibility — callers don't need
 * to change. Each tone now resolves to a different solid colour.
 */

const TONE_BG: Record<Tone, string> = {
  white: '#FFFFFF',
  cream: '#FFF6E8',
  lavender: '#F4F0FF',
  solid: '#FFFFFF',
};

function buildShellStyle(
  tone: Tone,
  radiusKey: keyof typeof radius,
  padding: number,
  shadow: keyof typeof shadows | 'none',
): ViewStyle {
  const r = radius[radiusKey];
  const base: ViewStyle = {
    backgroundColor: TONE_BG[tone],
    borderRadius: r,
    padding,
  };
  if (shadow === 'none') return base;
  return { ...base, ...shadows[shadow] };
}

export const GlassCard = forwardRef<View, GlassCardProps>(
  (
    {
      children,
      tone = 'white',
      radiusKey = '2xl',
      padding = 20,
      shadow = 'card',
      elevated = false,
      style,
      ...rest
    },
    ref,
  ) => {
    const shell = buildShellStyle(tone, radiusKey, padding, elevated ? 'cardLg' : shadow);
    return (
      <View ref={ref} style={[shell, style]} {...rest}>
        {children}
      </View>
    );
  },
);
GlassCard.displayName = 'GlassCard';

/**
 * Pressable variant — same look, with scale-on-press feedback.
 */
export function PressableGlassCard({
  children,
  tone = 'white',
  radiusKey = '2xl',
  padding = 20,
  shadow = 'card',
  style,
  disabled,
  ...rest
}: PressableGlassCardProps) {
  const shell = buildShellStyle(tone, radiusKey, padding, shadow);
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        shell,
        style,
        pressed && !disabled ? { transform: [{ scale: 0.985 }], opacity: 0.96 } : null,
        disabled ? { opacity: 0.6 } : null,
      ]}
      {...rest}
    >
      {typeof children === 'function' ? null : children}
    </Pressable>
  );
}

export default GlassCard;
