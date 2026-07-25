import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { FeedbackPressable } from '../../components/FeedbackPressable';
import { Screen } from '../../components/Screen';
import { StateBlock } from '../../components/StateBlock';
import { useLanguage } from '../../context/LanguageContext';
import { getApiErrorCode } from '../../features/auth/useAuth';
import { OAuthRegistrationForm } from '../../features/auth/OAuthRegistrationForm';
import {
  clearOAuthRegistrationSession,
  getOAuthRegistrationSession,
} from '../../features/auth/oauthRegistrationSession';
import { resetOAuthProviderSelection } from '../../features/auth/useOAuth';
import { useCompleteOAuthRegistration } from '../../features/auth/useOAuthRegistration';
import { colors, spacing, typography } from '../../theme/tokens';

export default function OAuthCompleteScreen() {
  const { t } = useLanguage();
  const [session] = useState(getOAuthRegistrationSession);
  const complete = useCompleteOAuthRegistration();

  const cancel = async () => {
    if (session) await resetOAuthProviderSelection(session.profile.provider);
    clearOAuthRegistrationSession();
    router.replace('/login');
  };

  return (
    <Screen
      testID="auth.oauth-complete.screen"
      background="auth"
      topInset
      scroll
      keyboard
      bottomGap={spacing['2xl']}
      contentStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg }}
    >
      <StatusBar style="dark" />
      <FeedbackPressable
        onPress={cancel}
        accessibilityRole="button"
        accessibilityLabel={t.common.back}
        style={{
          alignSelf: 'flex-start',
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
        }}
        pressedStyle={{ opacity: 0.7 }}
      >
        <Ionicons name="chevron-back" size={28} color={colors.brandCoral} />
      </FeedbackPressable>

      {session ? (
        <>
          <Text style={[typography.heading, { color: colors.textMain }]}>
            {t.auth.oauth_complete_title}
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing['2xl'] },
            ]}
          >
            {t.auth.oauth_complete_hint}
          </Text>
          <OAuthRegistrationForm
            session={session}
            pending={complete.isPending}
            errorCode={getApiErrorCode(complete.error)}
            onComplete={(input) => complete.mutate(input)}
            onCancel={cancel}
          />
        </>
      ) : (
        <View style={{ paddingTop: spacing['3xl'] }}>
          <StateBlock
            tone="neutral"
            icon="shield-checkmark-outline"
            title={t.auth.oauth_session_missing_title}
            message={t.auth.oauth_session_missing_body}
            actionLabel={t.auth.oauth_session_missing_action}
            onAction={() => router.replace('/login')}
          />
        </View>
      )}
    </Screen>
  );
}
