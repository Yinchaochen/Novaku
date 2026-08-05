import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text,
  TextInput,
  TextStyle,
  View,
} from 'react-native';
import { z } from 'zod/v4';

import { DatePicker } from '../../components/datetime/DatePicker';
import { useLanguage } from '../../context/LanguageContext';
import { getApiErrorCode, useRegister } from '../../features/auth/useAuth';
import { useAppleLogin, useGoogleLogin } from '../../features/auth/useOAuth';
import { oauthErrorMessage } from '../../features/auth/oauthErrorMessage';
import { tap } from '../../lib/haptics';
import { colors } from '../../theme/tokens';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { Screen } from '../../components/Screen';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { OAuthLegalDisclosure } from '../../components/auth/OAuthLegalDisclosure';

const CONSENT_DOCUMENT_VERSION = '2026-05-05.v1';
const CURRENT_YEAR = new Date().getFullYear();
// Postervia's current Privacy Policy and Terms require users to be at least 16.
const MIN_AGE = 16;
const MIN_BIRTH_DATE = new Date(1900, 0, 1);
const INITIAL_BIRTH_DATE = new Date(CURRENT_YEAR - 18, 0, 1);

const INPUT_FILL = '#FFE9A8';        // soft butter for input fields
const INPUT_FILL_FOCUSED = '#FFE2A0'; // not used yet but reserved for focus state

const schema = z.object({
  email: z.email(),
  password: z.string().min(8),
  display_name: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

function calculateAge(date: Date): number {
  const now = new Date();
  let years = now.getFullYear() - date.getFullYear();
  const beforeBirthday =
    now.getMonth() < date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() < date.getDate());
  if (beforeBirthday) years -= 1;
  return Math.max(years, 0);
}

function localDateValue(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}

export default function RegisterScreen() {
  const { t, langCode } = useLanguage();
  const register = useRegister();
  const google = useGoogleLogin();
  const apple = useAppleLogin();
  const oauthErrorCode = google.errorCode ?? apple.errorCode;
  const registerErrorCode = getApiErrorCode(register.error);

  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [birthDatePickerOpen, setBirthDatePickerOpen] = useState(false);
  const [birthDateError, setBirthDateError] = useState(false);
  const [acceptTos, setAcceptTos] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const age = useMemo(() => (birthDate ? calculateAge(birthDate) : null), [birthDate]);
  const isMinor = age !== null && age < MIN_AGE;
  const buildConsents = () => [
    { consent_type: 'tos', granted: true, document_version: CONSENT_DOCUMENT_VERSION },
    { consent_type: 'privacy_policy', granted: true, document_version: CONSENT_DOCUMENT_VERSION },
    {
      consent_type: 'marketing_email',
      granted: acceptMarketing,
      document_version: CONSENT_DOCUMENT_VERSION,
    },
  ];

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { display_name: '', email: '', password: '' },
  });

  const canSubmit =
    birthDate !== null && !isMinor && acceptTos && acceptPrivacy && !register.isPending;

  const handleBirthDateChange = (date: Date | null) => {
    setBirthDate(date);
    setBirthDateError(false);
    if (!date) return;

    if (calculateAge(date) < MIN_AGE) {
      setBirthDateError(true);
      Alert.alert(t.auth.underage_title, t.auth.underage_body);
    }
  };

  const handleBirthDatePickerOpenChange = (open: boolean) => {
    setBirthDatePickerOpen(open);
  };

  const onSubmit = (data: FormData) => {
    if (birthDate === null) {
      setBirthDateError(true);
      setConsentError(false);
      setBirthDatePickerOpen(true);
      return;
    }
    if (isMinor) {
      setBirthDateError(true);
      setConsentError(false);
      Alert.alert(t.auth.underage_title, t.auth.underage_body);
      return;
    }
    if (!acceptTos || !acceptPrivacy) {
      setBirthDateError(false);
      setConsentError(true);
      return;
    }
    setBirthDateError(false);
    setConsentError(false);

    register.mutate(
      {
        ...data,
        locale: langCode,
        birth_date: localDateValue(birthDate),
        consents: buildConsents(),
      },
    );
  };

  const labelStyle: TextStyle = {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B2A22',
    marginBottom: 8,
    fontFamily: 'PlusJakartaSans_700Bold',
  };

  const inputBoxStyle = {
    backgroundColor: INPUT_FILL,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: '#3B2A22',
    minHeight: 50,
  } as const;

  return (
    <Screen
      testID="auth.register.screen"
      background="auth"
      scroll
      keyboard
      bottomGap={32}
      header={(
        <AuthHeader
          title={t.auth.create_account}
          backLabel={t.common.back}
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/login');
            }
          }}
        />
      )}
      contentStyle={{ paddingHorizontal: 22, paddingTop: 28, backgroundColor: '#FFFAF2' }}
    >
      <StatusBar style="light" />

        <View>
          {Platform.OS === 'ios' ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={28}
              style={{ width: '100%', height: 52, marginBottom: 12 }}
              onPress={() => void apple.signIn()}
            />
          ) : null}
          <GoogleSignInButton
            label={t.auth.continue_with_google}
            onPress={() => void google.signIn()}
            disabled={!google.request || google.isPending}
            loading={google.isPending}
          />
          {google.isError || apple.isError ? (
            <Text style={{ marginTop: 10, fontSize: 12, color: colors.danger, textAlign: 'center' }}>
              {oauthErrorMessage(oauthErrorCode, t.auth.errors)}
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(98,57,40,0.14)' }} />
          <Text style={{ fontSize: 13, color: colors.textMuted }}>{t.auth.or}</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(98,57,40,0.14)' }} />
        </View>

        {/* Full name (display_name) */}
        <Text style={labelStyle}>{t.auth.display_name}</Text>
        <Controller
          control={control}
          name="display_name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              testID="auth.register.displayName"
              style={inputBoxStyle}
              placeholder={t.auth.display_name}
              placeholderTextColor="#A89A92"
              value={value ?? ''}
              onChangeText={onChange}
              accessibilityLabel={t.auth.display_name}
            />
          )}
        />
        {errors.display_name ? (
          <Text style={{ marginTop: 4, fontSize: 12, color: colors.danger }}>{errors.display_name.message}</Text>
        ) : null}

        {/* Password — with eye toggle */}
        <Text style={[labelStyle, { marginTop: 18 }]}>{t.auth.password}</Text>
        <View style={{ position: 'relative' }}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextInput
                testID="auth.register.password"
                style={[inputBoxStyle, { paddingRight: 48 }]}
                placeholder={t.auth.password}
                placeholderTextColor="#A89A92"
                value={value ?? ''}
                onChangeText={onChange}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                importantForAutofill="yes"
                accessibilityLabel={t.auth.password}
              />
            )}
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            style={{
              position: 'absolute',
              width: 44,
              right: 4,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityRole="button"
            accessibilityLabel={t.auth.password}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.brandCoral}
            />
          </Pressable>
        </View>
        {errors.password ? (
          <Text style={{ marginTop: 4, fontSize: 12, color: colors.danger }}>{errors.password.message}</Text>
        ) : null}

        {/* Email */}
        <Text style={[labelStyle, { marginTop: 18 }]}>{t.auth.email}</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <TextInput
              testID="auth.register.email"
              style={inputBoxStyle}
              placeholder="example@example.com"
              placeholderTextColor="#A89A92"
              value={value ?? ''}
              onChangeText={onChange}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              importantForAutofill="yes"
              accessibilityLabel={t.auth.email}
            />
          )}
        />
        {errors.email ? (
          <Text style={{ marginTop: 4, fontSize: 12, color: colors.danger }}>{errors.email.message}</Text>
        ) : null}

        {/* The API validates the exact birthday and stores only the birth year. */}
        <Text style={[labelStyle, { marginTop: 18 }]}>{t.auth.birth_year_label}</Text>
        <DatePicker
          testID="auth.register.birthDate"
          value={birthDate}
          onChange={handleBirthDateChange}
          placeholder={t.auth.birth_year_placeholder}
          minDate={MIN_BIRTH_DATE}
          maxDate={new Date()}
          initialViewDate={INITIAL_BIRTH_DATE}
          open={birthDatePickerOpen}
          onOpenChange={handleBirthDatePickerOpenChange}
        />
        <Text style={{ marginTop: 6, fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
          {t.auth.birth_year_hint}
        </Text>
        {birthDateError && birthDate === null ? (
          <Text style={{ marginTop: 6, fontSize: 12, color: colors.danger }}>
            {t.auth.birth_year_placeholder}
          </Text>
        ) : null}
        {/* GDPR consent rows — kept (legal requirement) but compact */}
        <View style={{ marginTop: 22, gap: 10 }}>
          <ConsentRow
            testID="auth.register.consent.tos"
            checked={acceptTos}
            onToggle={() => setAcceptTos((v) => !v)}
            label={t.auth.consent_tos_label.replace('{tos}', t.auth.consent_link_tos)}
            required
          >
            {renderConsentLabel(t.auth.consent_tos_label, t.auth.consent_link_tos, () =>
              router.push('/legal/agb' as never),
            )}
          </ConsentRow>
          <ConsentRow
            testID="auth.register.consent.privacy"
            checked={acceptPrivacy}
            onToggle={() => setAcceptPrivacy((v) => !v)}
            label={t.auth.consent_privacy_label.replace(
              '{privacy}',
              t.auth.consent_link_privacy,
            )}
            required
          >
            {renderConsentLabel(t.auth.consent_privacy_label, t.auth.consent_link_privacy, () =>
              router.push('/legal/datenschutz' as never),
            )}
          </ConsentRow>
          <ConsentRow
            checked={acceptMarketing}
            onToggle={() => setAcceptMarketing((v) => !v)}
            label={t.auth.consent_marketing_label}
          >
            <Text style={{ flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.textMuted }}>
              {t.auth.consent_marketing_label}
            </Text>
          </ConsentRow>
        </View>

        {consentError ? (
          <Text style={{ marginTop: 10, fontSize: 12, color: colors.danger, textAlign: 'center' }}>
            {t.auth.consent_required_hint}
          </Text>
        ) : null}

        {/* Sign Up — coral pill */}
        <View
          style={{
            marginTop: 22,
            height: 56,
            alignSelf: 'stretch',
            borderRadius: 28,
            backgroundColor: canSubmit ? '#FF8F7E' : '#E5E0D7',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: canSubmit ? 1 : 0.55,
            shadowColor: colors.brandCoral,
            shadowOpacity: canSubmit ? 0.22 : 0,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 10 },
            elevation: canSubmit ? 6 : 0,
          }}
        >
          <Pressable
            testID="auth.register.submit"
            onPress={() => {
              tap('medium');
              handleSubmit(onSubmit)();
            }}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={t.auth.register}
            accessibilityState={{ disabled: !canSubmit, busy: register.isPending }}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {register.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_700Bold',
                  color: canSubmit ? '#FFFFFF' : colors.textMuted,
                  fontWeight: '700',
                  fontSize: 17,
                  letterSpacing: 0.3,
                  textAlign: 'center',
                }}
              >
                {t.auth.register}
              </Text>
            )}
          </Pressable>
        </View>

        {register.isError ? (
          <Text style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: colors.danger }}>
            {registerErrorCode === 'auth.email_taken'
              ? t.auth.errors.email_taken
              : registerErrorCode === 'auth.underage'
              ? t.auth.errors.underage
              : t.auth.errors.unknown}
          </Text>
        ) : null}

        {/* Already have account → back to login */}
        <View
          testID="auth.register.account-switch"
          style={{
            marginTop: 26,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 13.5, color: colors.textMuted }}>
            {t.auth.already_have_account}
          </Text>
          <Pressable
            onPress={() => router.replace('/login')}
            style={{ minWidth: 44, minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel={t.auth.login}
          >
            <Text
              style={{
                fontSize: 13.5,
                color: colors.brandCoral,
                fontWeight: '700',
              }}
            >
              {' '}
              {t.auth.login}
            </Text>
          </Pressable>
        </View>
        <OAuthLegalDisclosure />
    </Screen>
  );
}

/**
 * Reusable consent label — splits the i18n template at {tos}/{privacy} and
 * inlines a coral underlined link in the slot.
 */
function renderConsentLabel(template: string, linkLabel: string, onPress: () => void) {
  const parts = template.split(/\{(?:tos|privacy)\}/);
  return (
    <>
      <Text style={{ flexShrink: 1, fontSize: 12.5, lineHeight: 18, color: colors.textMuted }}>
        {parts[0]}
      </Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel={linkLabel}
        style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text
          style={{ fontSize: 12.5, fontWeight: '700', color: colors.brandCoral, textDecorationLine: 'underline' }}
        >
          {linkLabel}
        </Text>
      </Pressable>
      <Text style={{ flexShrink: 1, fontSize: 12.5, lineHeight: 18, color: colors.textMuted }}>
        {parts[1] ?? ''}
      </Text>
    </>
  );
}

function ConsentRow({
  testID,
  checked,
  onToggle,
  label,
  required,
  children,
}: {
  testID?: string;
  checked: boolean;
  onToggle: () => void;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Pressable
        testID={testID}
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked }}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            borderWidth: 1.5,
            borderColor: checked ? colors.brandCoral : 'rgba(98,57,40,0.20)',
            backgroundColor: checked ? colors.brandCoral : '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
        </View>
      </Pressable>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
        {children}
        {required ? <Text style={{ color: colors.brandCoral, fontWeight: '700' }}>*</Text> : null}
      </View>
    </View>
  );
}

