import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import { EVENT_INTERESTS, type EventInterest, useUpdateEventPush } from '../../features/social/useSocial';
import { useAuthStore } from '../../store/authStore';

const ICONS: Record<EventInterest, keyof typeof Ionicons.glyphMap> = {
  founder: 'rocket-outline',
  developer: 'code-slash-outline',
  designer: 'color-palette-outline',
  investor: 'trending-up-outline',
  student: 'school-outline',
  jobseeker: 'briefcase-outline',
  creative: 'brush-outline',
};

export default function EventRemindersScreen() {
  const { t } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const update = useUpdateEventPush();

  const enabled = user?.event_push_enabled ?? true;
  const selected = new Set<EventInterest>((user?.event_interests ?? []) as EventInterest[]);

  const save = async (patch: { enabled?: boolean; interests?: EventInterest[] }) => {
    try {
      const updated = await update.mutateAsync(patch);
      if (updated && setUser) setUser(updated);
    } catch (err) {
      Alert.alert(t.common.error, (err as Error).message ?? '');
    }
  };

  const toggleInterest = (interest: EventInterest) => {
    const next = new Set(selected);
    if (next.has(interest)) next.delete(interest);
    else next.add(interest);
    void save({ interests: [...next] });
  };

  const labels: Record<EventInterest, { title: string; hint: string }> = {
    founder: { title: t.settings.event_interest_founder, hint: t.settings.event_interest_founder_hint },
    developer: { title: t.settings.event_interest_developer, hint: t.settings.event_interest_developer_hint },
    designer: { title: t.settings.event_interest_designer, hint: t.settings.event_interest_designer_hint },
    investor: { title: t.settings.event_interest_investor, hint: t.settings.event_interest_investor_hint },
    student: { title: t.settings.event_interest_student, hint: t.settings.event_interest_student_hint },
    jobseeker: { title: t.settings.event_interest_jobseeker, hint: t.settings.event_interest_jobseeker_hint },
    creative: { title: t.settings.event_interest_creative, hint: t.settings.event_interest_creative_hint },
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top']}>
      <SettingsHeader title={t.settings.event_push_title} onBack={() => router.back()} />

      <ScrollView className="flex-1" contentContainerClassName="pb-12 pt-2">
        <Text className="px-5 pb-3 text-[12px] leading-5 text-neutral-500">
          {t.settings.event_push_explainer}
        </Text>

        <View className="mx-4 mb-4 flex-row items-center gap-3 rounded-[20px] bg-white px-4 py-4">
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-[#3B2A22]">{t.settings.event_push_label}</Text>
            <Text className="mt-0.5 text-[12px] leading-4 text-neutral-500">{t.settings.event_push_hint}</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={(next) => void save({ enabled: next })}
            trackColor={{ true: '#F47C7C', false: '#D6D9E0' }}
          />
        </View>

        <Text className="px-5 pb-2 text-[12px] font-semibold uppercase tracking-wide text-neutral-400">
          {t.settings.event_interests_section}
        </Text>
        <View className="mx-4 overflow-hidden rounded-[20px] bg-white" style={{ opacity: enabled ? 1 : 0.5 }}>
          {EVENT_INTERESTS.map((interest, index) => {
            const isSelected = selected.has(interest);
            const meta = labels[interest];
            return (
              <Pressable
                key={interest}
                onPress={() => toggleInterest(interest)}
                disabled={update.isPending || !enabled}
                className="flex-row items-center gap-3 px-4 py-4"
                android_ripple={{ color: '#F4F5F8' }}
                style={
                  index < EVENT_INTERESTS.length - 1
                    ? { borderBottomWidth: 1, borderBottomColor: '#F4F5F8' }
                    : undefined
                }
              >
                <View className="h-9 w-9 items-center justify-center rounded-full bg-[#F4F5F8]">
                  <Ionicons name={ICONS[interest]} size={18} color={isSelected ? '#F47C7C' : '#3B2A22'} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-[#3B2A22]">{meta.title}</Text>
                  <Text className="mt-1 text-[12px] leading-4 text-neutral-500">{meta.hint}</Text>
                </View>
                <View
                  className="h-6 w-6 items-center justify-center rounded-md border-2 border-neutral-300"
                  style={isSelected ? { borderColor: '#F47C7C', backgroundColor: '#F47C7C' } : undefined}
                >
                  {isSelected ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {enabled && selected.size === 0 ? (
          <Text className="px-5 pt-3 text-[12px] leading-5 text-[#C0583E]">
            {t.settings.event_interests_none_hint}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
