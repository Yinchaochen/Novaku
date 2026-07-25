import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { DatePicker } from '../../components/datetime/DatePicker';
import { FeedbackPressable } from '../../components/FeedbackPressable';
import { GradientButton } from '../../components/GradientButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useLanguage } from '../../context/LanguageContext';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import type { OAuthRegistrationSession } from './oauthRegistrationSession';
import { oauthErrorMessage } from './oauthErrorMessage';
import { requiredOAuthRegistrationConsents } from './oauthRegistrationLegal';

const MIN_BIRTH_DATE = new Date(1900, 0, 1);

interface Props {
  session: OAuthRegistrationSession;
  pending: boolean;
  errorCode: string | null;
  onComplete: (input: {
    birth_date: string;
    consents: {
      consent_type: string;
      granted: boolean;
      document_version: string;
    }[];
  }) => void;
  onCancel: () => void;
}

function localDateValue(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}

export function OAuthRegistrationForm({
  session,
  pending,
  errorCode,
  onComplete,
  onCancel,
}: Props) {
  const { t } = useLanguage();
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [acceptTos, setAcceptTos] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const maximumBirthDate = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
  }, []);
  const providerName = session.profile.provider === 'google' ? 'Google' : 'Apple';

  const submit = () => {
    if (!birthDate) {
      setLocalError(t.auth.birth_year_hint);
      return;
    }
    if (birthDate > maximumBirthDate) {
      setLocalError(t.auth.errors.underage);
      return;
    }
    if (!acceptTos || !acceptPrivacy) {
      setLocalError(t.auth.errors.consent_required);
      return;
    }
    setLocalError(null);
    onComplete({
      birth_date: localDateValue(birthDate),
      consents: requiredOAuthRegistrationConsents(),
    });
  };

  return (
    <View style={{ gap: spacing.xl }}>
      <SurfaceCard tone="white" padding={spacing.lg}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {session.profile.avatarUrl ? (
            <Image
              source={{ uri: session.profile.avatarUrl }}
              style={{ width: 52, height: 52, borderRadius: radius.pill }}
              contentFit="cover"
              accessibilityLabel={session.profile.displayName}
            />
          ) : (
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: session.profile.provider === 'apple' ? '#111111' : '#F1F3F4',
              }}
            >
              <Ionicons
                name={session.profile.provider === 'apple' ? 'logo-apple' : 'person'}
                size={25}
                color={session.profile.provider === 'apple' ? '#FFFFFF' : '#4285F4'}
              />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.auth.oauth_profile_verified} · {providerName}
            </Text>
            <Text
              numberOfLines={2}
              style={[typography.bodyStrong, { marginTop: 2, color: colors.textMain }]}
            >
              {session.profile.displayName || session.profile.email}
            </Text>
            <Text numberOfLines={2} style={[typography.caption, { color: colors.textMuted }]}>
              {session.profile.email}
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        </View>
      </SurfaceCard>

      <View>
        <Text style={[typography.bodyStrong, { color: colors.textMain, marginBottom: spacing.sm }]}>
          {t.auth.birth_year_label}
        </Text>
        <DatePicker
          testID="auth.oauth.birth-date"
          value={birthDate}
          onChange={(value) => {
            setBirthDate(value);
            setLocalError(null);
          }}
          placeholder={t.auth.birth_year_placeholder}
          minDate={MIN_BIRTH_DATE}
          maxDate={maximumBirthDate}
          initialViewDate={new Date(maximumBirthDate.getFullYear() - 2, 0, 1)}
          height={54}
        />
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}>
          {t.auth.birth_year_hint}
        </Text>
      </View>

      <View style={{ gap: spacing.md }}>
        <ConsentRow
          checked={acceptTos}
          label={t.auth.consent_tos_label}
          linkLabel={t.auth.consent_link_tos}
          onToggle={() => {
            setAcceptTos((value) => !value);
            setLocalError(null);
          }}
          onLink={() => router.push('/legal/agb' as never)}
        />
        <ConsentRow
          checked={acceptPrivacy}
          label={t.auth.consent_privacy_label}
          linkLabel={t.auth.consent_link_privacy}
          onToggle={() => {
            setAcceptPrivacy((value) => !value);
            setLocalError(null);
          }}
          onLink={() => router.push('/legal/datenschutz' as never)}
        />
      </View>

      {localError || errorCode ? (
        <Text
          testID="auth.oauth.error"
          style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}
        >
          {localError ?? oauthErrorMessage(errorCode, t.auth.errors)}
        </Text>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <GradientButton
          label={t.auth.oauth_finish_account}
          onPress={submit}
          loading={pending}
          disabled={pending}
          fullWidth
          size="lg"
        />
        <GradientButton
          label={session.profile.provider === 'google' ? t.auth.oauth_cancel : t.common.cancel}
          onPress={onCancel}
          disabled={pending}
          fullWidth
          variant="ghost"
        />
      </View>
    </View>
  );
}

function ConsentRow({
  checked,
  label,
  linkLabel,
  onToggle,
  onLink,
}: {
  checked: boolean;
  label: string;
  linkLabel: string;
  onToggle: () => void;
  onLink: () => void;
}) {
  const parts = label.split(/\{(?:tos|privacy)\}/);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
      <FeedbackPressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityLabel={label.replace(/\{(?:tos|privacy)\}/, linkLabel)}
        accessibilityState={{ checked }}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        pressedStyle={{ opacity: 0.7 }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 7,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: checked ? colors.brandCoral : colors.lineSoft,
            backgroundColor: checked ? colors.brandCoral : colors.cardWhiteSolid,
          }}
        >
          {checked ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
        </View>
      </FeedbackPressable>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
        <Text style={[typography.caption, { flexShrink: 1, color: colors.textMuted, lineHeight: 21 }]}>
          {parts[0]}
        </Text>
        <FeedbackPressable
          onPress={onLink}
          accessibilityRole="link"
          accessibilityLabel={linkLabel}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          pressedStyle={{ opacity: 0.7 }}
        >
          <Text style={[typography.caption, { color: colors.brandCoral, fontWeight: '700' }]}>
            {linkLabel}
          </Text>
        </FeedbackPressable>
        <Text style={[typography.caption, { flexShrink: 1, color: colors.textMuted, lineHeight: 21 }]}>
          {parts[1] ?? ''}
        </Text>
      </View>
    </View>
  );
}
