import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/tokens';

// Account badge (D-063). Deliberately distinct from a post's
// verification_status, which says a *source* was re-checked — this one says
// something about the account holder and must never be presented as a
// guarantee about the accuracy of what they post.
export function VerifiedBadge({ size = 14 }: { size?: number }) {
  const { t } = useLanguage();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t.profile.verified_badge_label}
      testID="account.verified-badge"
      style={{ marginLeft: 4, justifyContent: 'center' }}
    >
      <Ionicons name="checkmark-circle" size={size} color={colors.brandCoral} />
    </View>
  );
}
