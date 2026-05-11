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
  ScrollView,
  Text,
  TextInput,
  TextStyle,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod/v4';

import { DatePicker } from '../../components/datetime/DatePicker';
import { useLanguage } from '../../context/LanguageContext';
import { getApiErrorCode, useRegister } from '../../features/auth/useAuth';
import { useAppleLogin, useGoogleLogin } from '../../features/auth/useOAuth';
import { tap } from '../../lib/haptics';
import { colors } from '../../theme/tokens';

const CONSENT_DOCUMENT_VERSION = '2026-05-05.v1';
const CURRENT_YEAR = new Date().getFullYear();
// GDPR Art. 8 default: data subjects must be at least 16 to consent on their
// own behalf. Some EU member states have lowered this to 13, but 16 is the
// safe default and what the Privacy Policy / Terms of Use declare.
const MIN_AGE = 16;
const MIN_BIRTH_DATE = new Date(1900, 0, 1);

// Yellow hero band — matches YumQuick reference (warm butter yellow). The
// register page hero is intentionally lighter than the welcome's coral so
// the two screens read as related but distinct moments.
const HERO_YELLOW = '#FFD17E';
const INPUT_FILL = '#FFE9A8';        // soft butter for input fields
const INPUT_FILL_FOCUSED = '#FFE2A0'; // not used yet but reserved for focus state

const schema = z.object({
  email: z.email(),
  password: z.string().min(8),
  display_name: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { t, langCode } = useLanguage();
  const insets = useSafeAreaInsets();
  const register = useRegister();
  const google = useGoogleLogin();
  const apple = useAppleLogin();
  const registerErrorCode = getApiErrorCode(register.error);

  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [gender, setGender] = useState<
    'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | null
  >(null);
  const [acceptTos, setAcceptTos] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const age = useMemo(() => {
    if (!birthDate) return null;
    const now = new Date();
    let years = now.getFullYear() - birthDate.getFullYear();
    const beforeBirthday =
      now.getMonth() < birthDate.getMonth() ||
      (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate());
    if (beforeBirthday) years -= 1;
    return Math.max(years, 0);
  }, [birthDate]);
  const isMinor = age !== null && age < MIN_AGE;
  const birthYear = birthDate?.getFullYear() ?? null;

  // OAuth users still register a fresh account if their email is new — so we
  // require the same legal consent (ToS + Privacy + age) before letting them
  // hit Google / Apple. GDPR Art. 6(1)(b) needs an active acceptance.
  const oauthReady = !!birthDate && !!gender && acceptTos && acceptPrivacy && !isMinor;
  const handleOAuth = (run: () => unknown) => {
    if (!oauthReady) {
      setConsentError(true);
      return;
    }
    setConsentError(false);
    void run();
  };

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { display_name: '', email: '', password: '' },
  });

  const canSubmit =
    !!birthDate && !isMinor && !!gender && acceptTos && acceptPrivacy && !register.isPending;

  const handleBirthDateChange = (date: Date | null) => {
    if (!date) {
      setBirthDate(null);
      return;
    }
    setBirthDate(date);
    const now = new Date();
    let years = now.getFullYear() - date.getFullYear();
    const beforeBirthday =
      now.getMonth() < date.getMonth() ||
      (now.getMonth() === date.getMonth() && now.getDate() < date.getDate());
    if (beforeBirthday) years -= 1;
    if (years < MIN_AGE) {
      Alert.alert(t.auth.underage_title, t.auth.underage_body);
    }
  };

  const onSubmit = (data: FormData) => {
    if (!birthDate || isMinor || !gender || !acceptTos || !acceptPrivacy) {
      setConsentError(true);
      return;
    }
    setConsentError(false);

    const consents = [
      { consent_type: 'tos', granted: true, document_version: CONSENT_DOCUMENT_VERSION },
      { consent_type: 'privacy_policy', granted: true, document_version: CONSENT_DOCUMENT_VERSION },
      {
        consent_type: 'marketing_email',
        granted: acceptMarketing,
        document_version: CONSENT_DOCUMENT_VERSION,
      },
    ];

    register.mutate(
      {
        ...data,
        locale: langCode,
        birth_year: birthDate.getFullYear(),
        gender,
        consents,
      },
      { onSuccess: () => router.replace('/(tabs)/plaza') },
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
    <View style={{ flex: 1, backgroundColor: '#FFFAF2' }}>
      {/* Status bar text light over the saturated yellow hero. */}
      <StatusBar style="light" />

      {/* Yellow hero band — back arrow + title */}
      <View
        style={{
          backgroundColor: HERO_YELLOW,
          paddingTop: Math.max(insets.top + 14, 36),
          paddingBottom: 36,
          paddingHorizontal: 22,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={() => {
              tap('light');
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(auth)/login');
              }
            }}
            hitSlop={12}
            style={({ pressed }) => [
              { padding: 4 },
              pressed ? { opacity: 0.7 } : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
          >
            <Ionicons name="chevron-back" size={28} color={colors.brandCoral} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center', marginRight: 32 /* offset back-button width */ }}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: '#FFFFFF',
                letterSpacing: 0.2,
                fontFamily: 'PlusJakartaSans_700Bold',
              }}
            >
              {t.auth.create_account}
            </Text>
          </View>
        </View>
      </View>

      {/* Form area — cream bg, scrolls when keyboard opens */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 28,
          paddingBottom: Math.max(insets.bottom + 32, 48),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Full name (display_name) */}
        <Text style={labelStyle}>{t.auth.display_name}</Text>
        <Controller
          control={control}
          name="display_name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={inputBoxStyle}
              placeholder={t.auth.display_name}
              placeholderTextColor="#A89A92"
              value={value ?? ''}
              onChangeText={onChange}
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
                style={[inputBoxStyle, { paddingRight: 48 }]}
                placeholder={t.auth.password}
                placeholderTextColor="#A89A92"
                value={value ?? ''}
                onChangeText={onChange}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            )}
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={8}
            style={{
              position: 'absolute',
              right: 14,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
            }}
            accessibilityRole="button"
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
              style={inputBoxStyle}
              placeholder="example@example.com"
              placeholderTextColor="#A89A92"
              value={value ?? ''}
              onChangeText={onChange}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          )}
        />
        {errors.email ? (
          <Text style={{ marginTop: 4, fontSize: 12, color: colors.danger }}>{errors.email.message}</Text>
        ) : null}

        {/* Date of birth — full date picker so users can pick year + month + day. */}
        <Text style={[labelStyle, { marginTop: 18 }]}>{t.auth.birth_year_label}</Text>
        <DatePicker
          value={birthDate}
          onChange={handleBirthDateChange}
          placeholder={t.auth.birth_year_placeholder}
          minDate={MIN_BIRTH_DATE}
          maxDate={new Date()}
        />
        <Text style={{ marginTop: 6, fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
          {t.auth.birth_year_hint}
        </Text>
        {isMinor ? (
          <View style={{
            marginTop: 8,
            backgroundColor: 'rgba(244, 124, 124, 0.10)',
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}>
            <Text style={{ fontSize: 12, lineHeight: 17, color: colors.danger }}>{t.auth.minor_notice}</Text>
          </View>
        ) : null}

        {/* Gender — required so Buddy compose doesn't gate users later. */}
        <Text style={[labelStyle, { marginTop: 18 }]}>{t.profile.gender_label}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['male', 'female', 'non_binary', 'prefer_not_to_say'] as const).map((g) => {
            const active = gender === g;
            return (
              <Pressable
                key={g}
                onPress={() => setGender(g)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: active ? '#F47C7C' : 'rgba(59, 42, 34, 0.12)',
                  backgroundColor: active ? '#FFF1F2' : INPUT_FILL,
                }}
              >
                <Text
                  style={{
                    fontSize: 13.5,
                    fontWeight: '600',
                    color: active ? '#F47C7C' : '#3B2A22',
                  }}
                >
                  {t.buddy[`gender_${g}` as const]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* GDPR consent rows — kept (legal requirement) but compact */}
        <View style={{ marginTop: 22, gap: 10 }}>
          <ConsentRow checked={acceptTos} onToggle={() => setAcceptTos((v) => !v)} required>
            {renderConsentLabel(t.auth.consent_tos_label, t.auth.consent_link_tos, () =>
              router.push('/legal/agb' as never),
            )}
          </ConsentRow>
          <ConsentRow checked={acceptPrivacy} onToggle={() => setAcceptPrivacy((v) => !v)} required>
            {renderConsentLabel(t.auth.consent_privacy_label, t.auth.consent_link_privacy, () =>
              router.push('/legal/datenschutz' as never),
            )}
          </ConsentRow>
          <ConsentRow checked={acceptMarketing} onToggle={() => setAcceptMarketing((v) => !v)}>
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

        {(google.isError || apple.isError) ? (
          <Text style={{ marginTop: 10, fontSize: 12, color: colors.danger, textAlign: 'center' }}>
            {t.common.error}
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
            onPress={() => {
              tap('medium');
              handleSubmit(onSubmit)();
            }}
            disabled={!canSubmit}
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

        {/* OAuth row — small coral circle buttons */}
        <View style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 14 }}>
            {t.auth.or_sign_up_with}
          </Text>
          <View style={{ flexDirection: 'row', gap: 18, opacity: oauthReady ? 1 : 0.5 }}>
            <OAuthCircle
              onPress={() => handleOAuth(() => google.promptAsync())}
              disabled={!google.request || google.isPending}
              loading={google.isPending}
            >
              <Text style={{ color: colors.brandCoral, fontSize: 18, fontWeight: '700' }}>G</Text>
            </OAuthCircle>
            {Platform.OS === 'ios' && (
              <OAuthCircle
                onPress={() => handleOAuth(() => apple.signIn())}
                disabled={apple.isPending}
                loading={apple.isPending}
              >
                <Ionicons name="logo-apple" size={20} color={colors.brandCoral} />
              </OAuthCircle>
            )}
          </View>
        </View>

        {/* Already have account → back to login */}
        <View
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
            onPress={() => router.replace('/(auth)/login')}
            hitSlop={6}
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
      </ScrollView>
    </View>
  );
}

/**
 * Reusable consent label — splits the i18n template at {tos}/{privacy} and
 * inlines a coral underlined link in the slot.
 */
function renderConsentLabel(template: string, linkLabel: string, onPress: () => void) {
  const parts = template.split(/\{(?:tos|privacy)\}/);
  return (
    <Text style={{ flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.textMuted }}>
      {parts[0]}
      <Text
        style={{ fontWeight: '700', color: colors.brandCoral, textDecorationLine: 'underline' }}
        onPress={onPress}
      >
        {linkLabel}
      </Text>
      {parts[1] ?? ''}
    </Text>
  );
}

function ConsentRow({
  checked,
  onToggle,
  required,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Pressable onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
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
          marginTop: 1,
        }}
      >
        {checked ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
      </View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
        {children}
        {required ? <Text style={{ color: colors.brandCoral, fontWeight: '700' }}>*</Text> : null}
      </View>
    </Pressable>
  );
}

/**
 * Small coral circle button used for OAuth icons. Bordered + soft fill so it
 * matches YumQuick's look without needing brand-asset PNGs for each provider.
 */
function OAuthCircle({
  children,
  onPress,
  disabled,
  loading,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        tap('light');
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        {
          width: 48,
          height: 48,
          borderRadius: 24,
          borderWidth: 1.5,
          borderColor: 'rgba(246, 118, 115, 0.45)',
          backgroundColor: 'rgba(255, 232, 218, 0.85)',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        pressed && !disabled ? { transform: [{ scale: 0.94 }] } : null,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={colors.brandCoral} /> : children}
    </Pressable>
  );
}
