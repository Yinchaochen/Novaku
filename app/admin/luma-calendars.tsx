import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { SettingsHeader } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import { useLumaSeedCalendars } from '../../features/admin/useAdminLumaCalendars';

export default function AdminLumaCalendarsScreen() {
  const { t } = useLanguage();
  const { data: items, isLoading } = useLumaSeedCalendars();

  return (
    <Screen topInset>
      <SettingsHeader title={t.admin.luma_title} onBack={() => router.back()} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : !items || items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-[14px] text-gray-500">{t.admin.luma_empty}</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 14 }}>
          {items.map((item) => (
            <View
              key={item.calendar_id}
              className="rounded-3xl bg-white p-4"
              style={{ borderWidth: 1, borderColor: 'rgba(226,220,212,0.8)' }}
            >
              <Text className="text-[15px] font-extrabold text-gray-900">{item.organiser}</Text>
              <Text className="mt-0.5 text-[11px] text-gray-400">{item.calendar_id}</Text>

              <View className="mt-3 flex-row flex-wrap gap-2">
                <View
                  className="rounded-full px-2.5 py-1"
                  style={{
                    backgroundColor:
                      item.source === 'env' ? 'rgba(176,122,30,0.12)' : 'rgba(92,138,72,0.12)',
                  }}
                >
                  <Text
                    className="text-[11px] font-bold"
                    style={{ color: item.source === 'env' ? '#B07A1E' : '#5C8A48' }}
                  >
                    {item.source === 'env'
                      ? t.admin.luma_source_env
                      : t.admin.luma_source_discovered}
                  </Text>
                </View>
                <View
                  className="rounded-full px-2.5 py-1"
                  style={{
                    backgroundColor: item.enabled ? 'rgba(143,188,122,0.18)' : 'rgba(0,0,0,0.06)',
                  }}
                >
                  <Text
                    className="text-[11px] font-bold"
                    style={{ color: item.enabled ? '#5C8A48' : '#9CA3AF' }}
                  >
                    {item.enabled ? t.admin.luma_enabled_chip : t.admin.luma_disabled_chip}
                  </Text>
                </View>
              </View>

              {item.found_via ? (
                <Text className="mt-2 text-[12px] text-gray-600">
                  {t.admin.luma_found_via_label}: {item.found_via}
                </Text>
              ) : null}
              {item.created_at ? (
                <Text className="mt-1 text-[12px] text-gray-400">
                  {t.admin.luma_added_label}: {item.created_at.slice(0, 10)}
                </Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
