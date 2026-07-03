import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '../theme/tokens';

type SurfaceTone = 'white' | 'cream' | 'warm' | 'lavender' | 'sage';
type SurfaceShadow = keyof typeof shadows | 'none';

interface SurfaceBaseProps {
  children?: ReactNode;
  tone?: SurfaceTone;
  radiusKey?: keyof typeof radius;
  padding?: number;
  shadow?: SurfaceShadow;
  bordered?: boolean;
}

export interface SurfaceCardProps extends SurfaceBaseProps, Omit<ViewProps, 'style'> {
  style?: StyleProp<ViewStyle>;
}

export interface PressableSurfaceCardProps extends SurfaceBaseProps, Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
}

const SURFACE_BACKGROUNDS: Record<SurfaceTone, string> = {
  white: colors.cardWhiteSolid,
  cream: '#FFF7EC',
  warm: colors.bgWarm,
  lavender: '#F7F2FF',
  sage: '#F3FBEF',
};

function buildSurfaceStyle({
  tone,
  radiusKey,
  padding,
  shadow,
  bordered,
}: Required<Pick<SurfaceBaseProps, 'tone' | 'radiusKey' | 'padding' | 'shadow' | 'bordered'>>): ViewStyle {
  const base: ViewStyle = {
    backgroundColor: SURFACE_BACKGROUNDS[tone],
    borderRadius: radius[radiusKey],
    padding,
  };
  if (bordered) {
    base.borderWidth = StyleSheet.hairlineWidth;
    base.borderColor = colors.lineSoft;
  }
  if (shadow === 'none') return base;
  return { ...base, ...shadows[shadow] };
}

export function SurfaceCard({
  children,
  tone = 'white',
  radiusKey = '2xl',
  padding = spacing.xl,
  shadow = 'card',
  bordered = true,
  style,
  ...rest
}: SurfaceCardProps) {
  const surface = buildSurfaceStyle({ tone, radiusKey, padding, shadow, bordered });
  return (
    <View style={[surface, style]} {...rest}>
      {children}
    </View>
  );
}

export function PressableSurfaceCard({
  children,
  tone = 'white',
  radiusKey = '2xl',
  padding = spacing.xl,
  shadow = 'card',
  bordered = true,
  style,
  pressedStyle,
  disabled,
  ...rest
}: PressableSurfaceCardProps) {
  const surface = buildSurfaceStyle({ tone, radiusKey, padding, shadow, bordered });
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        surface,
        style,
        pressed && !disabled ? styles.pressed : null,
        pressed && !disabled ? pressedStyle : null,
        disabled ? styles.disabled : null,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.58,
  },
});
