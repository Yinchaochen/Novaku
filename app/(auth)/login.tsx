import { Ionicons } from '@expo/vector-icons';

import { fieldErrorText } from '../../lib/formErrors';
import { zodResolver } from '@hookform/resolvers/zod';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  TextStyle,
  View,
} from 'react-native';
import { z } from 'zod/v4';

import { useLanguage } from '../../context/LanguageContext';
import { getApiErrorCode, useLogin } from '../../features/auth/useAuth';
import { useAppleLogin, useGoogleLogin } from '../../features/auth/useOAuth';
import { tap } from '../../lib/haptics';
import {
  getRememberedEmail,
  setRememberedEmail,
  clearRememberedEmail,
} from '../../lib/rememberedEmail';
import { colors } from '../../theme/tokens';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { Screen } from '../../components/Screen';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { OAuthLegalDisclosure } from '../../components/auth/OAuthLegalDisclosure';
import { oauthErrorMessage } from '../../features/auth/oauthErrorMessage';

const INPUT_FILL = '#FFE9A8';

const schema = z.object({
  email: z.email('email_invalid'),
  password: z.string().min(8, 'password_too_short'),
});
type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { t } = useLanguage();
  const login = useLogin();
  const google = useGoogleLogin();
  const apple = useAppleLogin();
  const loginErrorCode = getApiErrorCode(login.error);
  const oauthErrorCode = google.errorCode ?? apple.errorCode;

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // On mount: pre-fill remembered email, and show the biometric button only
  // if the device has biometric hardware AND we already remember the user
  // (i.e. they've signed in before — otherwise the prompt has nothing to do).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remembered = await getRememberedEmail();
      if (!cancelled && remembered) {
        setValue('email', remembered);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setValue]);

  const onSubmit = (data: FormData) => {
    login.mutate(data, {
      onSuccess: async () => {
        // Persist email per "remember me". Never persist the password.
        if (rememberMe) {
          await setRememberedEmail(data.email);
        } else {
          await clearRememberedEmail();
        }
      },
    });
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
      testID="auth.login.screen"
      background="auth"
      scroll
      keyboard
      bottomGap={32}
      header={(
        <AuthHeader
          title={t.auth.login}
          backLabel={t.common.back}
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/welcome');
            }
          }}
        />
      )}
      contentStyle={{ paddingHorizontal: 22, paddingTop: 28, backgroundColor: '#FFFAF2' }}
    >
      <StatusBar style="light" />
        {/* Welcome heading */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold',
            fontSize: 28,
            fontWeight: '800',
            color: colors.textBrown,
            letterSpacing: -0.3,
            marginBottom: 10,
          }}
        >
          {t.auth.login_welcome_title}
        </Text>
        <Text
          style={{
            fontSize: 14,
            lineHeight: 21,
            color: colors.textMuted,
            marginBottom: 28,
          }}
        >
          {t.auth.login_welcome_hint}
        </Text>

        <View>
          {Platform.OS === 'ios' ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={28}
              style={{ width: '100%', height: 52, marginBottom: 12 }}
              onPress={() => {
                tap('light');
                void apple.signIn();
              }}
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

        {/* Email */}
        <Text style={labelStyle}>{t.auth.email}</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <TextInput
              testID="auth.login.email"
              style={inputBoxStyle}
              placeholder="example@example.com"
              placeholderTextColor="#A89A92"
              value={value ?? ''}
              onChangeText={onChange}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="username"
              importantForAutofill="yes"
              accessibilityLabel={t.auth.email}
            />
          )}
        />
        {errors.email ? (
          <Text style={{ marginTop: 4, fontSize: 12, color: colors.danger }}>{fieldErrorText(t.validation, errors.email)}</Text>
        ) : null}

        {/* Password — eye toggle */}
        <Text style={[labelStyle, { marginTop: 18 }]}>{t.auth.password}</Text>
        <View style={{ position: 'relative' }}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextInput
                testID="auth.login.password"
                style={[inputBoxStyle, { paddingRight: 48 }]}
                placeholder={t.auth.password}
                placeholderTextColor="#A89A92"
                value={value ?? ''}
                onChangeText={onChange}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
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
          <Text style={{ marginTop: 4, fontSize: 12, color: colors.danger }}>{fieldErrorText(t.validation, errors.password)}</Text>
        ) : null}

        {/* Remember me + Forgot password row */}
        <View
          style={{
            marginTop: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Pressable
            onPress={() => {
              tap('selection');
              setRememberMe((v) => !v);
            }}
            style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            accessibilityRole="checkbox"
            accessibilityLabel={t.auth.remember_me}
            accessibilityState={{ checked: rememberMe }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                borderWidth: 1.5,
                borderColor: rememberMe ? colors.brandCoral : 'rgba(98,57,40,0.20)',
                backgroundColor: rememberMe ? colors.brandCoral : '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {rememberMe ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
            </View>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>{t.auth.remember_me}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/forgot-password')}
            style={{ minWidth: 44, minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel={t.auth.forgot_password}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.brandCoral }}>
              {t.auth.forgot_password}
            </Text>
          </Pressable>
        </View>

        {/* Log In — coral pill */}
        <View
          style={{
            marginTop: 26,
            height: 56,
            alignSelf: 'stretch',
            borderRadius: 28,
            backgroundColor: '#FF8F7E',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: login.isPending ? 0.7 : 1,
            shadowColor: colors.brandCoral,
            shadowOpacity: 0.22,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 10 },
            elevation: 6,
          }}
        >
          <Pressable
            testID="auth.login.submit"
            onPress={() => {
              tap('medium');
              handleSubmit(onSubmit)();
            }}
            disabled={login.isPending}
            accessibilityRole="button"
            accessibilityLabel={t.auth.login}
            accessibilityState={{ disabled: login.isPending, busy: login.isPending }}
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
            {login.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_700Bold',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: 17,
                  letterSpacing: 0.3,
                  textAlign: 'center',
                }}
              >
                {t.auth.login}
              </Text>
            )}
          </Pressable>
        </View>

        {login.isError ? (
          <Text style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: colors.danger }}>
            {loginErrorCode === 'auth.invalid_credentials'
              ? t.auth.errors.invalid_credentials
              : loginErrorCode === 'auth.inactive'
                ? t.auth.errors.inactive
                : t.auth.errors.unknown}
          </Text>
        ) : null}

        {/* Don't have an account? Sign up */}
        <View
          testID="auth.login.account-switch"
          style={{
            marginTop: 26,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 13.5, color: colors.textMuted }}>{t.auth.dont_have_account}</Text>
          <Pressable
            testID="auth.login.register"
            onPress={() => router.replace('/register')}
            style={{ minWidth: 44, minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel={t.auth.register}
          >
            <Text style={{ fontSize: 13.5, color: colors.brandCoral, fontWeight: '700' }}>
              {' '}
              {t.auth.register}
            </Text>
          </Pressable>
        </View>
        <OAuthLegalDisclosure />
    </Screen>
  );
}

