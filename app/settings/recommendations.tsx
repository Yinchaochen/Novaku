import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import { type FeedMode, useUpdateFeedMode } from '../../features/social/useSocial';
import { useAuthStore } from '../../store/authStore';

const OPTIONS: FeedMode[] = ['personalized', 'chronological', 'following'];

export default function RecommendationsScreen() {
  const { t } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const update = useUpdateFeedMode();

  const current = (user?.feed_mode as FeedMode | undefined) ?? 'personalized';

  const handleSelect = async (next: FeedMode) => {
    if (next === current || update.isPending) return;
    try {
      await update.mutateAsync(next);
    } catch (err) {
      Alert.alert(t.common.error, (err as Error).message ?? '');
    }
  };

  const labels: Record<FeedMode, { title: string; hint: string }> = {
    personalized: {
      title: t.settings.recommendations_mode_personalized,
      hint: t.settings.recommendations_mode_personalized_hint,
    },
    chronological: {
      title: t.settings.recommendations_mode_chronological,
      hint: t.settings.recommendations_mode_chronological_hint,
    },
    following: {
      title: t.settings.recommendations_mode_following,
      hint: t.settings.recommendations_mode_following_hint,
    },
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top']}>
      <SettingsHeader title={t.settings.recommendations_title} onBack={() => router.back()} />

      <ScrollView className="flex-1" contentContainerClassName="pb-12 pt-2">
        <Text className="px-5 pb-3 text-[12px] leading-5 text-neutral-500">
          {t.settings.recommendations_explainer}
        </Text>

        <View className="mx-4 overflow-hidden rounded-[20px] bg-white">
          {OPTIONS.map((option, index) => {
            const isSelected = option === current;
            const meta = labels[option];
            return (
              <Pressable
                key={option}
                onPress={() => void handleSelect(option)}
                disabled={update.isPending}
                className="flex-row items-start gap-3 px-4 py-4"
                android_ripple={{ color: '#F4F5F8' }}
                style={
                  index < OPTIONS.length - 1
                    ? { borderBottomWidth: 1, borderBottomColor: '#F4F5F8' }
                    : undefined
                }
              >
                <View
                  className="mt-0.5 h-5 w-5 items-center justify-center rounded-full border-2 border-neutral-300"
                  style={isSelected ? { borderColor: '#F47C7C' } : undefined}
                >
                  {isSelected ? <View className="h-2.5 w-2.5 rounded-full bg-[#F47C7C]" /> : null}
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-[#3B2A22]">{meta.title}</Text>
                  <Text className="mt-1 text-[12px] leading-4 text-neutral-500">{meta.hint}</Text>
                </View>
                {update.isPending && isSelected ? (
                  <ActivityIndicator size="small" color="#F47C7C" />
                ) : isSelected ? (
                  <Ionicons name="checkmark" size={18} color="#F47C7C" />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* Algorithm Transparency Card */}
        <View className="mx-4 mt-6 rounded-[24px] bg-white px-5 py-5">
          <View className="mb-2 flex-row items-center gap-2">
            <Ionicons name="sparkles-outline" size={18} color="#F47C7C" />
            <Text className="text-[14px] font-bold text-[#3B2A22]">
              {t.settings.recommendations_algorithm_transparency}
            </Text>
          </View>
          <Text className="text-[12px] leading-5 text-neutral-600">
            {t.settings.recommendations_algorithm_transparency_body}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
