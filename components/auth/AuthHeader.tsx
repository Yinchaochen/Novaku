import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '../../lib/haptics';
import { colors } from '../../theme/tokens';
import { FeedbackPressable } from '../FeedbackPressable';

export function AuthHeader({
  title,
  backLabel,
  onBack,
}: {
  title: string;
  backLabel: string;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: '#FFD17E',
        paddingTop: Math.max(insets.top + 14, 36),
        paddingBottom: 36,
        paddingHorizontal: 22,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <FeedbackPressable
          onPress={() => {
            tap('light');
            onBack();
          }}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          pressedStyle={{ opacity: 0.7 }}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
        >
          <Ionicons name="chevron-back" size={28} color={colors.brandCoral} />
        </FeedbackPressable>
        <View style={{ flex: 1, alignItems: 'center', marginRight: 32 }}>
          <Text
            numberOfLines={2}
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: '#FFFFFF',
              letterSpacing: 0.3,
              textAlign: 'center',
              fontFamily: 'PlusJakartaSans_700Bold',
            }}
          >
            {title}
          </Text>
        </View>
      </View>
    </View>
  );
}
