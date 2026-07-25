import { Text, View } from 'react-native';

import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { StateBlock } from '../../components/StateBlock';
import { SurfaceCard } from '../../components/SurfaceCard';
import { OAuthLegalDisclosure } from '../../components/auth/OAuthLegalDisclosure';
import { OAuthRegistrationForm } from '../../features/auth/OAuthRegistrationForm';
import type { OAuthRegistrationSession } from '../../features/auth/oauthRegistrationSession';
import { colors, spacing, typography } from '../../theme/tokens';

const googleSession: OAuthRegistrationSession = {
  registrationTicket: 'dev-google-ticket',
  profile: {
    provider: 'google',
    email: 'mira@example.com',
    displayName: 'Mira Chen',
    avatarUrl: null,
  },
};

const longGermanSession: OAuthRegistrationSession = {
  registrationTicket: 'dev-apple-ticket',
  profile: {
    provider: 'apple',
    email: 'alexandra-maria-von-wolkenstein@example.de',
    displayName: 'Alexandra-Maria von Wolkenstein-Schönberg',
    avatarUrl: null,
  },
};

function StateHeading({ children }: { children: string }) {
  return <Text style={[typography.bodyStrong, { color: colors.textMain }]}>{children}</Text>;
}

export default function AuthOAuthGallery() {
  return (
    <Screen
      header={(
        <PageHeader
          title="OAuth onboarding"
          subtitle="Normal · long German · empty · loading · self · other"
        />
      )}
      scroll
      bottomGap={spacing['2xl']}
      contentStyle={{ paddingHorizontal: spacing.xl, gap: spacing['2xl'] }}
    >
      <View style={{ gap: spacing.md }}>
        <StateHeading>1. Normal — platform confirms 16+</StateHeading>
        <SurfaceCard tone="white" padding={spacing.lg}>
          <StateBlock
            tone="success"
            icon="sparkles-outline"
            title="Quick account creation"
            message="A shared 16+ platform range creates the account without asking for an exact birth date."
          />
          <OAuthLegalDisclosure />
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>2. Long German fallback — age range unavailable</StateHeading>
        <OAuthRegistrationForm
          session={longGermanSession}
          pending={false}
          errorCode={null}
          onComplete={() => undefined}
          onCancel={() => undefined}
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>3. Empty — registration ticket missing</StateHeading>
        <StateBlock
          tone="neutral"
          icon="shield-checkmark-outline"
          title="Start again securely"
          message="This short registration session has expired or the app was restarted."
          actionLabel="Back to login"
          onAction={() => undefined}
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>4. Loading — account creation in progress</StateHeading>
        <OAuthRegistrationForm
          session={googleSession}
          pending
          errorCode={null}
          onComplete={() => undefined}
          onCancel={() => undefined}
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>5. Self — returning identity recognized</StateHeading>
        <SurfaceCard tone="white" padding={spacing.lg}>
          <StateBlock
            tone="success"
            icon="checkmark-circle-outline"
            title="Existing Postervia account"
            message="The stable provider identity signs in directly and returns to the original destination."
          />
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>6. Other — provider account conflict</StateHeading>
        <OAuthRegistrationForm
          session={longGermanSession}
          pending={false}
          errorCode="auth.oauth_account_conflict"
          onComplete={() => undefined}
          onCancel={() => undefined}
        />
      </View>
    </Screen>
  );
}
