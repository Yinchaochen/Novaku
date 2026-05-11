import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { tap } from '../lib/haptics';
import { colors, gradients, radius, shadows } from '../theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'glass';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label?: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  style?: ViewStyle;
}

const SIZE: Record<Size, { paddingV: number; paddingH: number; fontSize: number; minHeight: number }> = {
  sm: { paddingV: 10, paddingH: 18, fontSize: 13, minHeight: 40 },
  md: { paddingV: 14, paddingH: 22, fontSize: 15, minHeight: 50 },
  lg: { paddingV: 17, paddingH: 26, fontSize: 16, minHeight: 56 },
};

/**
 * Postervia primary CTA — coral→peach gradient capsule, soft warm shadow.
 *
 * Variants:
 *  - primary  : coral → peach gradient (default CTA)
 *  - secondary: lavender → cream (lower-emphasis)
 *  - glass    : translucent white capsule (sits on hero / image bg)
 *  - ghost    : transparent with coral text (tertiary)
 *
 * Sizes match the brief: pill capsule, scale 0.98 on press, opacity 0.55
 * when disabled.
 */
export function GradientButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  style,
}: Props) {
  const inactive = disabled || loading;
  const sizing = SIZE[size];

  const isFilled = variant === 'primary' || variant === 'secondary';
  const fillColors =
    variant === 'primary'
      ? gradients.brandCta
      : variant === 'secondary'
        ? (['#C5B4FF', '#FFD6BD'] as const)
        : (['rgba(255,255,255,0.92)', 'rgba(255,250,245,0.78)'] as const);

  const textColor =
    variant === 'glass' || variant === 'ghost' ? colors.brandCoral : '#FFFFFF';

  const shadow = variant === 'primary' ? shadows.cta : variant === 'glass' ? shadows.iconButton : shadows.card;

  return (
    <View
      style={[
        {
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: inactive ? 0.55 : 1,
        },
        style,
      ]}
    >
      <Pressable
        disabled={inactive}
        onPress={() => {
          tap(variant === 'primary' ? 'medium' : 'light');
          onPress?.();
        }}
        style={({ pressed }) => [
          {
            minHeight: sizing.minHeight,
            paddingHorizontal: sizing.paddingH,
            paddingVertical: sizing.paddingV,
            borderRadius: radius.pill,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            overflow: 'hidden',
            alignSelf: fullWidth ? 'stretch' : 'flex-start',
            borderWidth: variant === 'glass' ? 1 : variant === 'ghost' ? 0 : 1,
            borderColor:
              variant === 'glass'
                ? 'rgba(255,255,255,0.85)'
                : variant === 'primary'
                  ? 'rgba(255, 200, 175, 0.75)'
                  : 'rgba(255,255,255,0.55)',
            backgroundColor: variant === 'ghost' ? 'transparent' : undefined,
            ...(variant === 'ghost' ? {} : shadow),
          },
          pressed ? { transform: [{ scale: 0.98 }] } : null,
        ]}
      >
        {isFilled || variant === 'glass' ? (
          <LinearGradient
            colors={fillColors as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
          />
        ) : null}

        {/* Top inner highlight, only for filled variants */}
        {isFilled || variant === 'glass' ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 16,
              right: 16,
              height: 1,
              backgroundColor: 'rgba(255,255,255,0.55)',
            }}
          />
        ) : null}

        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {leadingIcon ?? null}
            {label ? (
              <Text
                numberOfLines={1}
                style={{
                  color: textColor,
                  fontSize: sizing.fontSize,
                  fontWeight: '700',
                  letterSpacing: 0.2,
                }}
              >
                {label}
              </Text>
            ) : null}
            {trailingIcon ?? null}
          </View>
        )}
      </Pressable>
    </View>
  );
}

export default GradientButton;
