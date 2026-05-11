import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useLanguage } from '../context/LanguageContext';
import { useAccountStatus } from '../features/compliance/useCompliance';

export function PendingDeletionBanner() {
  const { t } = useLanguage();
  const { data } = useAccountStatus();

  if (!data?.pending_deletion_at) return null;
  const days = data.deletion_grace_days_remaining ?? 0;

  return (
    <Pressable
      onPress={() => router.push('/settings/data' as never)}
      className="flex-row items-center gap-3 px-4 py-2.5"
      style={{ backgroundColor: '#F47C7C' }}
    >
      <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
      <View className="flex-1">
        <Text className="text-[13px] font-extrabold text-white">
          {t.settings.pending_deletion_banner_title}
        </Text>
        <Text className="text-[12px] leading-4 text-white/90">
          {t.settings.pending_deletion_banner_body.replace('{days}', String(days))}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
    </Pressable>
  );
}
