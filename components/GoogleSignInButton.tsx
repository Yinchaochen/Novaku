import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { usePressedFeedback } from '../hooks/usePressedFeedback';
import { tap } from '../lib/haptics';

// Official Google "G" mark (4-color), per Google's Sign in with Google
// branding guidelines. Do not recolor or alter the paths.
function GoogleGLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" style={{ width: size, height: size }}>
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

/**
 * Brand-compliant "Sign in with Google" button (light theme): white fill,
 * neutral border, official 4-color G logo. Keeps the existing
 * expo-auth-session flow — `onPress` should call `google.promptAsync()`.
 */
export function GoogleSignInButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [pressed, pressHandlers] = usePressedFeedback();
  return (
    <Pressable
      onPress={() => {
        tap('light');
        onPress();
      }}
      disabled={disabled}
      {...pressHandlers}
      style={[
        {
          width: '100%',
          height: 52,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: '#747775',
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        pressed && !disabled ? { transform: [{ scale: 0.98 }] } : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#3c4043" />
      ) : (
        <View
          pointerEvents="none"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <GoogleGLogo size={18} />
          <Text
            numberOfLines={1}
            style={{
              color: '#1f1f1f',
              fontSize: 15,
              fontWeight: '600',
              fontFamily: 'PlusJakartaSans_700Bold',
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
