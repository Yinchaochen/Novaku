import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';

export default function ConsentsScreen() {
  const { t } = useLanguage();
  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top']}>
      <SettingsHeader title={t.settings.consents_title} onBack={() => router.back()} />
      <ScrollView className="flex-1 px-5" contentContainerClassName="pb-12">
        <View className="mt-4 rounded-[24px] bg-white px-5 py-6">
          <View className="mb-3 flex-row items-center gap-2">
            <Ionicons name="construct-outline" size={20} color="#F47C7C" />
            <Text className="text-[16px] font-extrabold text-neutral-900">
              {t.legal.pending_review_title}
            </Text>
          </View>
          <Text className="text-[14px] leading-6 text-neutral-600">
            {t.settings.consents_pending_body}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
