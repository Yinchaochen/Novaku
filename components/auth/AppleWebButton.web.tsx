import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text } from 'react-native';

import { FeedbackPressable } from '../FeedbackPressable';

/**
 * "Continue with Apple" for the browser (D-151). Black pill with the Apple
 * mark, per Apple's sign-in button guidelines; the native button from
 * expo-apple-authentication does not exist on the web.
 */
export function AppleWebButton({
  label,
  onPress,
  loading,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <FeedbackPressable
      testID="auth.apple.web"
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        height: 44,
        borderRadius: 22,
        backgroundColor: '#000000',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12,
      }}
      pressedStyle={{ opacity: 0.85 }}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <>
          <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>{label}</Text>
        </>
      )}
    </FeedbackPressable>
  );
}
