import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LegalDocumentBody } from '../../components/LegalDocumentBody';
import { SettingsHeader } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import { getImpressum, getLastUpdatedLabel } from '../../lib/legalContent';

export default function ImpressumScreen() {
  const { t, langCode } = useLanguage();
  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top']}>
      <SettingsHeader title={t.legal.impressum_title} onBack={() => router.back()} />
      <ScrollView className="flex-1 px-5" contentContainerClassName="pb-12">
        <LegalDocumentBody
          source={getImpressum(langCode)}
          lastUpdatedLabel={getLastUpdatedLabel(langCode)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
