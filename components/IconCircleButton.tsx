import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { tap } from '../lib/haptics';
import { colors, gradients, shadows } from '../theme/tokens';

type Tone = 'glass' | 'coral' | 'lavender' | 'cream';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  size?: number;
  tone?: Tone;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

/**
 * Postervia round-icon button. Used in headers and tab-bar-adjacent spots.
 * Default tone = glass (translucent white) so it sits on any background.
 */
export function IconCircleButton({
  children,
  onPress,
  size = 44,
  tone = 'glass',
  disabled = false,
  style,
  accessibilityLabel,
}: Props) {
  // iOS gets real BlurView under the gradient — for the glass tone we drop
  // the gradient opacity so the frosted blur shows through. Other tones are
  // already filled colors, so no change needed.
  const useBlur = Platform.OS === 'ios' && tone === 'glass';
  const colorsForTone =
    tone === 'coral'
      ? gradients.brandCta
      : tone === 'lavender'
        ? (['#C5B4FF', '#E5DCFF'] as const)
        : tone === 'cream'
          ? (['#FFF1E0', '#FFE3CD'] as const)
          : useBlur
            ? (['rgba(255,255,255,0.30)', 'rgba(255,250,245,0.20)'] as const)
            : (['rgba(255,255,255,0.92)', 'rgba(255,250,245,0.78)'] as const);

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        tap('light');
        onPress?.();
      }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: tone === 'glass' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)',
          ...shadows.iconButton,
        },
        pressed ? { transform: [{ scale: 0.95 }] } : null,
        disabled ? { opacity: 0.5 } : null,
        style,
      ]}
    >
      {useBlur ? <BlurView intensity={26} tint="light" style={StyleSheet.absoluteFill} /> : null}
      <LinearGradient
        colors={colorsForTone as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 8,
          right: 8,
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.7)',
        }}
      />
      {children}
    </Pressable>
  );
}

export default IconCircleButton;

// Re-export so screens don't need to import tokens just to color the icon.
export { colors as iconButtonColors };
