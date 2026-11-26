import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import { api } from '../lib/api';
import { Language } from '../lib/languages';
import { reportToSentry } from '../lib/sentry';
import { useAuthStore } from '../store/authStore';
import { colors, typography } from '../theme/tokens';
import { PaperSticker } from './PaperSticker';
import { LanguagePicker } from './LanguagePicker';

/** Language pill in the top-right of the yellow header bands, on a paper sticker. */
export function LangPill() {
  const { langCode, setLangCode } = useLanguage();
  const { user, setUser } = useAuthStore();

  const handleSelect = async (lang: Language) => {
    await setLangCode(lang.code);
    if (user) {
      try {
        await api.patch('/auth/me', { locale: lang.code });
        setUser({ ...user, locale: lang.code });
      } catch (err) {
        // P2.8: locale sync to server failed → AI translations come back in
        // wrong language. Capture so we know if it's chronic vs transient.
        reportToSentry(err, { source: 'LangPill.locale_sync', locale: lang.code });
      }
    }
  };

  return (
    // Ink on a cream sticker: white text on the old coral gradient measured about
    // 2.6:1 and was hard to find on the yellow bands (user feedback 2026-11-26).
    <PaperSticker>
      <LanguagePicker currentCode={langCode} onSelect={handleSelect} tone="ink" />
    </PaperSticker>
  );
}

interface Props {
  title?: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}

export function PageHeader({ title, subtitle, trailing }: Props) {
  const insets = useSafeAreaInsets();

  if (!title) {
    return (
      <View
        className="flex-row items-center justify-end px-5 pb-2"
        style={{ paddingTop: Math.max(insets.top + 4, 12) }}
      >
        {trailing ?? <LangPill />}
      </View>
    );
  }

  return (
    <View
      className="flex-row items-end justify-between px-6 pb-4"
      style={{ paddingTop: Math.max(insets.top + 10, 18) }}
    >
      <View className="flex-1 pr-4">
        <View
          style={{
            width: 28,
            height: 4,
            borderRadius: 999,
            backgroundColor: colors.brandCoral,
            opacity: 0.85,
            marginBottom: 10,
          }}
        />
        <Text
          numberOfLines={1}
          style={{
            ...typography.title,
            color: colors.textMain,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={2}
            style={{
              marginTop: 4,
              fontSize: 14,
              lineHeight: 20,
              color: colors.textMuted,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? <LangPill />}
    </View>
  );
}

export default PageHeader;

// Keep the press-feedback opacity export so other components can match the
// header's visual style.
export const headerPressableStyle = ({ pressed }: { pressed: boolean }) => [
  pressed ? { opacity: 0.7 } : null,
] as const;

// Avoid unused-import warning while leaving Pressable available in the file.
void Pressable;
