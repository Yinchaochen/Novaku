import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type ButtonVariant = 'primary' | 'success' | 'neutral';
type ButtonSize = 'sm' | 'md';

interface Props {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, {
  face: string;
  base: string;
  border: string;
  text: string;
  spinner: string;
}> = {
  primary: {
    face: '#5B67CA',
    base: '#434FAF',
    border: '#7380E0',
    text: '#FFFFFF',
    spinner: '#FFFFFF',
  },
  success: {
    face: '#58CC02',
    base: '#43A700',
    border: '#78D938',
    text: '#FFFFFF',
    spinner: '#FFFFFF',
  },
  neutral: {
    face: '#FFFFFF',
    base: '#D9E0EC',
    border: '#E7ECF5',
    text: '#5B67CA',
    spinner: '#5B67CA',
  },
};

const SIZE_STYLES: Record<ButtonSize, {
  shellPaddingBottom: number;
  paddingHorizontal: number;
  paddingVertical: number;
  minHeight: number;
  fontSize: number;
  radius: number;
}> = {
  sm: {
    shellPaddingBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 42,
    fontSize: 13,
    radius: 16,
  },
  md: {
    shellPaddingBottom: 5,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 48,
    fontSize: 14,
    radius: 18,
  },
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
  const palette = VARIANT_STYLES[variant];
  const sizing = SIZE_STYLES[size];
  const inactive = disabled || loading;

  return (
    <View
      style={{
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        opacity: inactive ? 0.65 : 1,
        minWidth: 0,
      }}
    >
      <View
        style={{
          backgroundColor: palette.base,
          borderRadius: sizing.radius + 2,
          paddingBottom: sizing.shellPaddingBottom,
          minWidth: 0,
        }}
      >
        <Pressable
          disabled={inactive}
          onPress={onPress}
          style={({ pressed }) => ({
            minHeight: sizing.minHeight,
            borderRadius: sizing.radius,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.face,
            paddingHorizontal: sizing.paddingHorizontal,
            paddingVertical: sizing.paddingVertical,
            justifyContent: 'center',
            alignItems: 'center',
            alignSelf: fullWidth ? 'stretch' : 'flex-start',
            maxWidth: '100%',
            minWidth: 0,
            transform: [{ translateY: pressed ? sizing.shellPaddingBottom : 0 }],
          })}
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
                fontWeight: '800',
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
    </View>
  );
}
