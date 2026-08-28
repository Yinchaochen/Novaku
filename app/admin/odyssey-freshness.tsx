import { openExternalUrl } from '../../lib/links';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { SettingsHeader } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import {
  ProposedNodeChange,
  useProposedNodeChanges,
  useResolveProposedChange,
} from '../../features/admin/useAdminFreshness';

function localized(value: Record<string, string> | null, langCode: string) {
  if (!value) return '';
  return value[langCode] ?? value.en ?? Object.values(value)[0] ?? '';
}

export default function AdminOdysseyFreshnessScreen() {
  const { t, langCode } = useLanguage();
  const { data: items, isLoading } = useProposedNodeChanges();
  const resolve = useResolveProposedChange();

  const handleResolve = (item: ProposedNodeChange, accept: boolean) => {
    if (!accept) {
      resolve.mutate({ nodeId: item.id, accept: false });
      return;
    }
    Alert.alert(t.admin.freshness_confirm_accept_title, t.admin.freshness_confirm_accept_body, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.confirm,
        onPress: () =>
          resolve.mutate(
            { nodeId: item.id, accept: true },
            {
              onSuccess: () => {
                Alert.alert(t.admin.freshness_title, t.admin.freshness_toast_resolved);
              },
              onError: () => {
                Alert.alert(t.admin.freshness_title, t.common.error);
              },
            },
          ),
      },
    ]);
  };

  return (
    <Screen topInset>
      <SettingsHeader title={t.admin.freshness_title} onBack={() => router.back()} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : !items || items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-[14px] text-gray-500">{t.admin.freshness_empty}</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 14 }}>
          {items.map((item) => (
            <View
              key={item.id}
              className="rounded-3xl bg-white p-4"
              style={{ borderWidth: 1, borderColor: 'rgba(226,220,212,0.8)' }}
            >
              <Text className="text-[15px] font-extrabold text-gray-900">
                {localized(item.title, langCode)}
              </Text>
              <Text className="mt-0.5 text-[11px] text-gray-400">{item.slug}</Text>

              {item.change_summary ? (
                <View className="mt-3 rounded-2xl px-3 py-2" style={{ backgroundColor: 'rgba(176,122,30,0.1)' }}>
                  <Text className="text-[11px] font-bold" style={{ color: '#B07A1E' }}>
                    {t.admin.freshness_change_summary_label}
                  </Text>
                  <Text className="mt-1 text-[13px] leading-5 text-gray-700">{item.change_summary}</Text>
                </View>
              ) : null}

              {item.proposed_description ? (
                <View className="mt-3">
                  <Text className="text-[11px] font-bold text-gray-400">
                    {t.admin.freshness_current_label}
                  </Text>
                  <Text className="mt-1 text-[13px] leading-5 text-gray-500">
                    {localized(item.description, langCode)}
                  </Text>
                  <Text className="mt-2 text-[11px] font-bold" style={{ color: '#5C8A48' }}>
                    {t.admin.freshness_proposed_label}
                  </Text>
                  <Text className="mt-1 text-[13px] leading-5 text-gray-800">
                    {item.proposed_description}
                  </Text>
                </View>
              ) : null}

              {item.proposed_deadline_hint ? (
                <Text className="mt-2 text-[12px] text-gray-600">
                  {t.admin.freshness_deadline_label}: {localized(item.deadline_hint, langCode) || '—'} →{' '}
                  {item.proposed_deadline_hint}
                </Text>
              ) : null}

              {item.source_url ? (
                <Pressable onPress={() => void openExternalUrl(item.source_url)}>
                  <Text className="mt-2 text-[12px] font-semibold" style={{ color: '#FF9F6E' }}>
                    {t.admin.freshness_source_label}: {item.source_url}
                  </Text>
                </Pressable>
              ) : null}

              <View className="mt-4 flex-row gap-3">
                <Pressable
                  onPress={() => handleResolve(item, true)}
                  disabled={resolve.isPending}
                  className="flex-1 items-center rounded-full py-2.5"
                  style={{ backgroundColor: '#8FBC7A' }}
                >
                  <Text className="text-[13px] font-bold text-white">{t.admin.freshness_accept}</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleResolve(item, false)}
                  disabled={resolve.isPending}
                  className="flex-1 items-center rounded-full py-2.5"
                  style={{ backgroundColor: '#F0E7DE' }}
                >
                  <Text className="text-[13px] font-bold text-gray-600">{t.admin.freshness_reject}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
