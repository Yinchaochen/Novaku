import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import { useNetworkHealthStore } from '../store/networkHealthStore';

// MS-16: surfaces the networkHealthStore signal (consecutive request
// failures while NetInfo still reports "connected") so a flaky-but-linked
// network reads as "we know, hang on" instead of silent stuck spinners.
export function NetworkHealthBanner() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const isDegraded = useNetworkHealthStore((state) => state.isDegraded);

  if (!isDegraded) return null;

  return (
    <View
      className="flex-row items-center gap-3 px-4 pb-2.5"
      style={{ backgroundColor: '#9CA3AF', paddingTop: insets.top + 10 }}
    >
      <Ionicons name="cloud-offline-outline" size={18} color="#FFFFFF" />
      <Text className="flex-1 text-[13px] font-semibold text-white">
        {t.common.network_degraded_banner}
      </Text>
    </View>
  );
}
