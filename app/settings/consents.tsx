import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import { type ConsentType, useConsents, useSetConsent } from '../../features/compliance/useCompliance';

export default function ConsentsScreen() {
  const { t } = useLanguage();
  const consentsQuery = useConsents();
  const setConsent = useSetConsent();

  const isGranted = (type: ConsentType) =>
    consentsQuery.data?.find((c) => c.consent_type === type)?.granted ?? false;

  // Required agreements — accepted at sign-up, withdrawable only by deleting
  // the account. Tapping opens the document.
  const agreements: { type: ConsentType; label: string; desc: string; route: string }[] = [
    {
      type: 'privacy_policy',
      label: t.settings.consent_privacy_policy_label,
      desc: t.settings.consent_privacy_policy_desc,
      route: '/legal/datenschutz',
    },
    {
      type: 'tos',
      label: t.settings.consent_tos_label,
      desc: t.settings.consent_tos_desc,
      route: '/legal/agb',
    },
  ];

  // Optional consents — user can toggle on/off at any time.
  const optional: { type: ConsentType; label: string; desc: string }[] = [
    {
      type: 'marketing_email',
      label: t.settings.consent_marketing_email_label,
      desc: t.settings.consent_marketing_email_desc,
    },
    {
      type: 'push_notifications',
      label: t.settings.consent_push_notifications_label,
      desc: t.settings.consent_push_notifications_desc,
    },
    {
      type: 'ml_training',
      label: t.settings.consent_ml_training_label,
      desc: t.settings.consent_ml_training_desc,
    },
    {
      type: 'location_sharing',
      label: t.settings.consent_location_sharing_label,
      desc: t.settings.consent_location_sharing_desc,
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top']}>
      <SettingsHeader title={t.settings.consents_title} onBack={() => router.back()} />
      <ScrollView className="flex-1 px-5" contentContainerClassName="pb-12">
        <Text className="mb-5 mt-2 text-[13px] leading-5 text-neutral-500">
          {t.settings.consents_intro}
        </Text>

        {consentsQuery.isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#F47C7C" />
          </View>
        ) : (
          <>
            <Text className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wider text-neutral-400">
              {t.settings.consents_section_agreements}
            </Text>
            <View className="mb-6 overflow-hidden rounded-[20px] bg-white">
              {agreements.map((a, i) => (
                <Pressable
                  key={a.type}
                  onPress={() => router.push(a.route as never)}
                  className={`flex-row items-center gap-3 px-4 py-4 ${i > 0 ? 'border-t border-[#F0F1F4]' : ''}`}
                >
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-neutral-900">{a.label}</Text>
                    <Text className="mt-0.5 text-[12px] leading-4 text-neutral-500">{a.desc}</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                    <Text className="text-[12px] font-semibold text-neutral-400">
                      {t.settings.consents_accepted}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <Text className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wider text-neutral-400">
              {t.settings.consents_section_optional}
            </Text>
            <View className="mb-4 overflow-hidden rounded-[20px] bg-white">
              {optional.map((o, i) => (
                <View
                  key={o.type}
                  className={`flex-row items-center gap-3 px-4 py-4 ${i > 0 ? 'border-t border-[#F0F1F4]' : ''}`}
                >
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-neutral-900">{o.label}</Text>
                    <Text className="mt-0.5 text-[12px] leading-4 text-neutral-500">{o.desc}</Text>
                  </View>
                  <Switch
                    value={isGranted(o.type)}
                    onValueChange={(next) => setConsent.mutate({ consentType: o.type, granted: next })}
                    trackColor={{ true: '#F47C7C', false: '#D6D9E0' }}
                  />
                </View>
              ))}
            </View>

            <Text className="px-1 text-[11px] leading-4 text-neutral-400">
              {t.settings.consents_legal_note}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
