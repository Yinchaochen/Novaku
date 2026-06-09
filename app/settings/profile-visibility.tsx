import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import { type ProfileVisibility, useUpdateProfileVisibility } from '../../features/social/useSocial';
import { useAuthStore } from '../../store/authStore';

const OPTIONS: ProfileVisibility[] = ['public', 'followers', 'friends', 'only_me'];

export default function ProfileVisibilityScreen() {
  const { t } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const update = useUpdateProfileVisibility();

  const current = (user?.profile_visibility as ProfileVisibility | undefined) ?? 'public';

  const handleSelect = async (next: ProfileVisibility) => {
    if (next === current || update.isPending) return;
    try {
      const updated = await update.mutateAsync(next);
      if (updated && setUser) {
        setUser(updated);
      }
    } catch (err) {
      Alert.alert(t.common.error, (err as Error).message ?? '');
    }
  };

  const labels: Record<ProfileVisibility, { title: string; hint: string }> = {
    public: {
      title: t.settings.profile_visibility_public,
      hint: t.settings.profile_visibility_public_hint,
    },
    followers: {
      title: t.settings.profile_visibility_followers,
      hint: t.settings.profile_visibility_followers_hint,
    },
    friends: {
      title: t.settings.profile_visibility_friends,
      hint: t.settings.profile_visibility_friends_hint,
    },
    only_me: {
      title: t.settings.profile_visibility_only_me,
      hint: t.settings.profile_visibility_only_me_hint,
    },
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top']}>
      <SettingsHeader title={t.settings.profile_visibility_title} onBack={() => router.back()} />

      <ScrollView className="flex-1" contentContainerClassName="pb-12 pt-2">
        <Text className="px-5 pb-3 text-[12px] leading-5 text-neutral-500">
          {t.settings.profile_visibility_explainer}
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
      </ScrollView>
    </SafeAreaView>
  );
}
