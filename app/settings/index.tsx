import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader, SettingsRow, SettingsSection } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/authStore';

export default function SettingsHubScreen() {
  const { t } = useLanguage();
  const version = Constants.expoConfig?.version ?? '0.1.0';
  const isStaff = useAuthStore((s) => s.user?.is_staff ?? false);

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top']}>
      <SettingsHeader title={t.settings.title} onBack={() => router.back()} />

      <ScrollView className="flex-1" contentContainerClassName="pb-12 pt-2">
        <SettingsSection title={t.settings.section_account}>
          <SettingsRow
            icon="person-outline"
            label={t.settings.account_edit_profile}
            onPress={() => router.push('/edit-bio' as never)}
          />
          {/* Hidden until Postervia+ launches publicly. Restore by removing the `false &&` guard. */}
          {false ? (
            <SettingsRow
              icon="diamond-outline"
              label={t.billing.settings_entry}
              hint={t.billing.settings_entry_hint}
              onPress={() => router.push('/billing/subscribe' as never)}
            />
          ) : null}
        </SettingsSection>

        <SettingsSection title={t.settings.section_privacy}>
          <SettingsRow
            icon="eye-outline"
            label={t.settings.privacy_visibility}
            hint={t.settings.privacy_visibility_hint}
            onPress={() => router.push('/(tabs)/profile' as never)}
          />
          <SettingsRow
            icon="search-outline"
            label={t.settings.search_visibility_title}
            hint={t.settings.search_visibility_hint}
            onPress={() => router.push('/settings/search-visibility' as never)}
          />
          <SettingsRow
            icon="checkmark-done-outline"
            label={t.settings.privacy_consents}
            hint={t.settings.privacy_consents_hint}
            onPress={() => router.push('/settings/consents' as never)}
          />
          <SettingsRow
            icon="cloud-download-outline"
            label={t.settings.privacy_data}
            hint={t.settings.privacy_data_hint}
            onPress={() => router.push('/settings/data' as never)}
          />
          <SettingsRow
            icon="sparkles-outline"
            label={t.settings.privacy_recommendations}
            hint={t.settings.privacy_recommendations_hint}
            onPress={() => router.push('/settings/recommendations' as never)}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label={t.settings.privacy_cookies}
            hint={t.settings.privacy_cookies_hint}
            onPress={() => router.push('/legal/cookies' as never)}
          />
        </SettingsSection>

        <SettingsSection title={t.settings.section_legal}>
          <SettingsRow
            icon="business-outline"
            label={t.settings.legal_impressum}
            onPress={() => router.push('/legal/impressum' as never)}
          />
          <SettingsRow
            icon="lock-closed-outline"
            label={t.settings.legal_privacy_policy}
            onPress={() => router.push('/legal/datenschutz' as never)}
          />
          <SettingsRow
            icon="document-text-outline"
            label={t.settings.legal_terms}
            onPress={() => router.push('/legal/agb' as never)}
          />
          <SettingsRow
            icon="people-outline"
            label={t.settings.legal_community_guidelines}
            onPress={() => router.push('/legal/community-guidelines' as never)}
          />
          <SettingsRow
            icon="bar-chart-outline"
            label={t.settings.legal_transparency}
            onPress={() => router.push('/legal/transparency' as never)}
          />
        </SettingsSection>

        <SettingsSection title={t.settings.section_about}>
          <SettingsRow
            icon="information-circle-outline"
            label={`${t.settings.about_version} ${version}`}
            onPress={() => {}}
          />
        </SettingsSection>

        <SettingsSection title={t.settings.section_labs}>
          <SettingsRow
            icon="flask-outline"
            label={t.settings.labs_entry}
            hint={t.settings.labs_entry_hint}
            onPress={() => router.push('/labs' as never)}
          />
        </SettingsSection>

        {isStaff ? (
          <SettingsSection title={t.settings.section_admin}>
            <SettingsRow
              icon="shield-outline"
              label={t.settings.admin_buddy_applications}
              hint={t.settings.admin_buddy_applications_hint}
              onPress={() => router.push('/admin/buddy-applications' as never)}
            />
          </SettingsSection>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
