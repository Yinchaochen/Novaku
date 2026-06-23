import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/tokens';
import type { CommunitySelectedPlaceInput } from '../features/community/useCommunity';

export interface LocationPickerProps {
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialPlaceName?: string | null;
  outerInsets?: { top: number; bottom: number };
  onConfirm: (place: CommunitySelectedPlaceInput) => void;
  onCancel: () => void;
}

// Web build of components/LocationPicker.tsx. react-native-maps is native-only
// and breaks the web bundle, so Metro resolves this stub on web. Precise
// map-based place picking stays an app feature; the web version explains that
// and backs out cleanly. (Web-only debug affordance — copy intentionally kept
// out of the i18n system, which governs the shipped mobile app.)
export function LocationPicker({ onCancel }: LocationPickerProps) {
  const { t } = useLanguage();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgCream,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 24,
          backgroundColor: colors.bgWarm,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
        }}
      >
        <Ionicons name="map-outline" size={34} color={colors.brandCoral} />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textMain, textAlign: 'center' }}>
        Map place-picking is in the app
      </Text>
      <Text
        style={{ marginTop: 8, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}
      >
        Open Postervia on your phone to drop a pin and attach a precise location.
      </Text>
      <Pressable
        onPress={onCancel}
        style={{
          marginTop: 22,
          borderRadius: 999,
          backgroundColor: colors.brandCoral,
          paddingHorizontal: 26,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{t.common.back}</Text>
      </Pressable>
    </View>
  );
}
