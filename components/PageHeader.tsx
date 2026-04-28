import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import { api } from '../lib/api';
import { Language } from '../lib/languages';
import { useAuthStore } from '../store/authStore';
import { LanguagePicker } from './LanguagePicker';

interface Props {
  title: string;
}

export function PageHeader({ title }: Props) {
  const { langCode, setLangCode } = useLanguage();
  const { user, setUser } = useAuthStore();
  const insets = useSafeAreaInsets();

  const handleSelect = async (lang: Language) => {
    await setLangCode(lang.code);
    if (user) {
      try {
        await api.patch('/auth/me', { locale: lang.code });
        setUser({ ...user, locale: lang.code });
      } catch {
        // best-effort server sync
      }
    }
  };

  return (
    <View
      className="flex-row items-center justify-between px-5 pb-4"
      style={{ paddingTop: Math.max(insets.top + 8, 18) }}
    >
      <View className="flex-1 pr-4">
        <View className="mb-2 h-1.5 w-16 rounded-full bg-primary/70" />
        <Text className="text-[30px] font-extrabold text-gray-900" numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={{ backgroundColor: '#434FAF', borderRadius: 18, paddingBottom: 4 }}>
        <View style={{ backgroundColor: '#5B67CA', borderRadius: 16, overflow: 'hidden' }}>
          <LanguagePicker currentCode={langCode} onSelect={handleSelect} />
        </View>
      </View>
    </View>
  );
}
