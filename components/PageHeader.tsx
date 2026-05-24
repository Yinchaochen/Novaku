import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import { api } from '../lib/api';
import { Language } from '../lib/languages';
import { reportToSentry } from '../lib/sentry';
import { useAuthStore } from '../store/authStore';
import { colors, gradients, shadows, typography } from '../theme/tokens';
import { LanguagePicker } from './LanguagePicker';

/**
 * Glass-style language pill. Sits in the top-right of every primary screen.
 * The earlier blue-purple "Duolingo stack" has been replaced with a soft
 * coral→peach gradient + glass border — matches the new brand language.
 */
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
    <View
      style={{
        borderRadius: 999,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 200, 175, 0.65)',
        ...shadows.iconButton,
      }}
    >
      <LinearGradient
        colors={gradients.brandCta as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 12,
          right: 12,
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.55)',
        }}
      />
      <LanguagePicker currentCode={langCode} onSelect={handleSelect} />
    </View>
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
