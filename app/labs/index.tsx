import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader, SettingsRow, SettingsSection } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';

export default function LabsHubScreen() {
  const { t } = useLanguage();

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top']}>
      <SettingsHeader title={t.labs.title} onBack={() => router.back()} />

      <ScrollView className="flex-1" contentContainerClassName="pb-12 pt-2">
        <SettingsSection title={t.labs.section_deprecated}>
          <SettingsRow
            icon="document-text-outline"
            label={t.labs.scribe_label}
            hint={t.labs.scribe_hint}
            onPress={() => router.push('/labs/scribe' as never)}
          />
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}
