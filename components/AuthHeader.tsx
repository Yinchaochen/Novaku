import { View } from 'react-native';

import { useLanguage } from '../context/LanguageContext';
import { Language } from '../lib/languages';
import { LanguagePicker } from './LanguagePicker';

export function AuthHeader() {
  const { langCode, setLangCode } = useLanguage();

  const handleSelect = async (lang: Language) => {
    await setLangCode(lang.code);
  };

  return (
    <View className="absolute top-12 right-5" style={{ zIndex: 10 }}>
      <View style={{ backgroundColor: '#FF9F6E', borderRadius: 12, overflow: 'hidden' }}>
        <LanguagePicker currentCode={langCode} onSelect={handleSelect} />
      </View>
    </View>
  );
}
