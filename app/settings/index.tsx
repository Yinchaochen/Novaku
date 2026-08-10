import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader, SettingsRow, SettingsSection } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import { useCreateDSR } from '../../features/compliance/useCompliance';
import { useProductGuide } from '../../features/guide/useProductGuide';
import { useAuthStore } from '../../store/authStore';

export default function SettingsHubScreen() {
  const { t } = useLanguage();
  const { restart: restartGuide } = useProductGuide();
  const version = Constants.expoConfig?.version ?? '0.1.0';
  const isStaff = useAuthStore((s) => s.user?.is_staff ?? false);
  const createDsr = useCreateDSR();

  // App Store Guideline 5.1.1(v): account deletion must be reachable in-app.
  // Initiates the GDPR erasure DSR, then opens the Data screen where the user
  // sees the pending-deletion state and can cancel within the grace period.
  const requestAccountDeletion = () => {
    Alert.alert(t.settings.data_delete_confirm_title, t.settings.data_delete_confirm_body, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.settings.data_delete_action,
        style: 'destructive',
        onPress: () =>
          createDsr.mutate(
            { request_type: 'erasure' },
            {
              onSuccess: () => router.push('/settings/data' as never),
              onError: () => Alert.alert(t.common.error),
            },
          ),
      },
    ]);
  };

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
          <SettingsRow
            icon="flag-outline"
            label={t.guide.settings_row_title}
            hint={t.guide.settings_row_hint}
            onPress={() => {
              restartGuide();
              router.push('/(tabs)/tasks' as never);
            }}
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
          <SettingsRow
            icon="trash-outline"
            label={t.settings.data_delete}
            hint={t.settings.data_delete_hint}
            onPress={requestAccountDeletion}
            destructive
          />
        </SettingsSection>

        <SettingsSection title={t.settings.section_privacy}>
          <SettingsRow
            icon="eye-outline"
            label={t.settings.privacy_visibility}
            hint={t.settings.privacy_visibility_hint}
            onPress={() => router.push('/settings/profile-visibility' as never)}
          />
          <SettingsRow
            icon="search-outline"
            label={t.settings.search_visibility_title}
            hint={t.settings.search_visibility_hint}
            onPress={() => router.push('/settings/search-visibility' as never)}
          />
          <SettingsRow
            icon="ban-outline"
            label={t.settings.blocked_users_title}
            hint={t.settings.blocked_users_hint}
            onPress={() => router.push('/settings/blocked-users' as never)}
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
            <SettingsRow
              icon="alert-circle-outline"
              label={t.settings.admin_moderation}
              hint={t.settings.admin_moderation_hint}
              onPress={() => router.push('/admin/moderation' as never)}
            />
            <SettingsRow
              icon="refresh-circle-outline"
              label={t.settings.admin_freshness}
              hint={t.settings.admin_freshness_hint}
              onPress={() => router.push('/admin/odyssey-freshness' as never)}
            />
            <SettingsRow
              icon="megaphone-outline"
              label={t.settings.admin_releases}
              hint={t.settings.admin_releases_hint}
              onPress={() => router.push('/admin/app-releases' as never)}
            />
            <SettingsRow
              icon="checkmark-circle-outline"
              label={t.settings.admin_verified_title}
              hint={t.settings.admin_verified_hint}
              onPress={() => router.push('/admin/verified-accounts' as never)}
            />
          </SettingsSection>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
