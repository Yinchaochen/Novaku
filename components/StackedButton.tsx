import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { tap } from '../lib/haptics';
import { colors, radius, shadows } from '../theme/tokens';

type ButtonVariant = 'primary' | 'success' | 'neutral';
type ButtonSize = 'xs' | 'sm' | 'md';

interface Props {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const VARIANT_FILL: Record<
  ButtonVariant,
  { fill: string; text: string; spinner: string; border: string }
> = {
  primary: {
    fill: colors.brandCoral,
    text: '#FFFFFF',
    spinner: '#FFFFFF',
    border: 'rgba(255, 200, 175, 0.75)',
  },
  success: {
    fill: '#82C46F',
    text: '#FFFFFF',
    spinner: '#FFFFFF',
    border: 'rgba(180, 220, 160, 0.65)',
  },
  neutral: {
    fill: '#FFFFFF',
    text: colors.brandCoral,
    spinner: colors.brandCoral,
    border: 'rgba(232, 221, 210, 0.8)',
  },
};

const SIZE_STYLES: Record<
  ButtonSize,
  { paddingH: number; paddingV: number; minHeight: number; fontSize: number }
> = {
  xs: { paddingH: 40, paddingV: 7, minHeight: 38, fontSize: 13.5 },
  sm: { paddingH: 16, paddingV: 10, minHeight: 42, fontSize: 13 },
  md: { paddingH: 20, paddingV: 13, minHeight: 50, fontSize: 15 },
};

export function StackedButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: Props) {
  const palette = VARIANT_FILL[variant];
  const sizing = SIZE_STYLES[size];
  const inactive = disabled || loading;
  const baseShadow = variant === 'neutral' ? shadows.card : shadows.cta;
  const minButtonWidth = size === 'xs' ? 72 : 0;

  return (
    <View
      style={{
        alignSelf: fullWidth ? 'stretch' : 'auto',
        opacity: inactive ? 0.55 : 1,
        minWidth: minButtonWidth,
      }}
    >
      <Pressable
        disabled={inactive}
        onPress={() => {
          tap(variant === 'success' ? 'success' : 'light');
          onPress?.();
        }}
        style={{
          minHeight: sizing.minHeight,
          paddingHorizontal: sizing.paddingH,
          paddingVertical: sizing.paddingV,
          borderRadius: radius.pill,
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: fullWidth || size === 'xs' ? 'stretch' : 'flex-start',
          maxWidth: '100%',
          minWidth: minButtonWidth,
          backgroundColor: palette.fill,
          borderWidth: 1,
          borderColor: palette.border,
          ...baseShadow,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={palette.spinner} />
        ) : (
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{
              color: palette.text,
              fontSize: sizing.fontSize,
              fontWeight: '700',
              letterSpacing: 0.2,
              lineHeight: sizing.fontSize + 4,
              textAlign: 'center',
              maxWidth: '100%',
            }}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export default StackedButton;
