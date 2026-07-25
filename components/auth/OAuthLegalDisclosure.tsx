import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../theme/tokens';
import { FeedbackPressable } from '../FeedbackPressable';

export function OAuthLegalDisclosure() {
  const { t } = useLanguage();

  return (
    <View testID="auth.oauth.legal-disclosure" style={{ marginTop: 10, alignItems: 'center' }}>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: 11.5,
          lineHeight: 17,
          textAlign: 'center',
        }}
      >
        {t.buddy.apply.submit_consent_inline}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <LegalLink
          label={t.auth.consent_link_tos}
          onPress={() => router.push('/legal/agb' as never)}
        />
        <Text accessibilityElementsHidden style={{ color: colors.textMuted }}>
          {' · '}
        </Text>
        <LegalLink
          label={t.auth.consent_link_privacy}
          onPress={() => router.push('/legal/datenschutz' as never)}
        />
      </View>
    </View>
  );
}

function LegalLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <FeedbackPressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
      }}
      pressedStyle={{ opacity: 0.7 }}
    >
      <Text
        style={{
          color: colors.brandCoral,
          fontSize: 11.5,
          fontWeight: '700',
          textDecorationLine: 'underline',
        }}
      >
        {label}
      </Text>
    </FeedbackPressable>
  );
}
