import { Ionicons } from '@expo/vector-icons';
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
  ScrollView,
  Text,
  TextInput,
  TextStyle,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod/v4';

import { useLanguage } from '../../context/LanguageContext';
import { getApiErrorCode, useLogin } from '../../features/auth/useAuth';
import { useAppleLogin, useGoogleLogin } from '../../features/auth/useOAuth';
import {
  isBiometricAvailable,
  promptBiometric,
} from '../../lib/biometric';
import { tap } from '../../lib/haptics';
import {
  getRememberedEmail,
  setRememberedEmail,
  clearRememberedEmail,
} from '../../lib/rememberedEmail';
import { colors } from '../../theme/tokens';

const HERO_YELLOW = '#FFD17E';
const INPUT_FILL = '#FFE9A8';

const schema = z.object({
  email: z.email(),
  password: z.string().min(8),
});
type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const login = useLogin();
  const google = useGoogleLogin();
  const apple = useAppleLogin();
  const loginErrorCode = getApiErrorCode(login.error);

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [biometricVisible, setBiometricVisible] = useState(false);

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
      const hw = await isBiometricAvailable();
      if (!cancelled) {
        setBiometricVisible(hw && Boolean(remembered));
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
        router.replace('/(tabs)/plaza');
      },
    });
  };

  const handleBiometric = async () => {
    tap('light');
    const result = await promptBiometric(t.auth.biometric_unlock_prompt);
    if (!result.success) return;
    // On success, surface the remembered email so the user only needs to type
    // their password (or use a saved password from the OS keychain).
    const remembered = await getRememberedEmail();
    if (remembered) {
      setValue('email', remembered);
    }
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
      <StatusBar style="light" />

      {/* Yellow hero band */}
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
              router.back();
            }}
            hitSlop={12}
            style={({ pressed }) => [{ padding: 4 }, pressed ? { opacity: 0.7 } : null]}
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
          >
            <Ionicons name="chevron-back" size={28} color={colors.brandCoral} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center', marginRight: 32 }}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: '#FFFFFF',
                letterSpacing: 0.3,
                fontFamily: 'PlusJakartaSans_700Bold',
              }}
            >
              {t.auth.login}
            </Text>
          </View>
        </View>
      </View>

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

        {/* Email */}
        <Text style={labelStyle}>{t.auth.email}</Text>
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

        {/* Password — eye toggle */}
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
            style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}
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
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            accessibilityRole="checkbox"
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
          <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={6}>
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
            onPress={() => {
              tap('medium');
              handleSubmit(onSubmit)();
            }}
            disabled={login.isPending}
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

        {/* Biometric button — only if device supports + user opted in earlier */}
        {biometricVisible ? (
          <Pressable
            onPress={handleBiometric}
            style={({ pressed }) => [
              {
                marginTop: 14,
                paddingVertical: 14,
                borderRadius: 999,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 1.5,
                borderColor: 'rgba(246, 118, 115, 0.45)',
                backgroundColor: 'rgba(255, 232, 218, 0.85)',
              },
              pressed ? { transform: [{ scale: 0.98 }] } : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t.auth.login_with_biometric}
          >
            <Ionicons name="finger-print" size={20} color={colors.brandCoral} />
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_700Bold',
                fontSize: 14,
                fontWeight: '700',
                color: colors.brandCoral,
                letterSpacing: 0.2,
              }}
            >
              {t.auth.login_with_biometric}
            </Text>
          </Pressable>
        ) : null}

        {/* OAuth row */}
        <View style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 14 }}>
            {t.auth.or_sign_in_with}
          </Text>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            <OAuthCircle
              onPress={() => google.promptAsync()}
              disabled={!google.request || google.isPending}
              loading={google.isPending}
            >
              <Text style={{ color: colors.brandCoral, fontSize: 18, fontWeight: '700' }}>G</Text>
            </OAuthCircle>
            {Platform.OS === 'ios' && (
              <OAuthCircle
                onPress={() => apple.signIn()}
                disabled={apple.isPending}
                loading={apple.isPending}
              >
                <Ionicons name="logo-apple" size={20} color={colors.brandCoral} />
              </OAuthCircle>
            )}
          </View>
          {(google.isError || apple.isError) ? (
            <Text style={{ marginTop: 10, fontSize: 12, color: colors.danger }}>{t.common.error}</Text>
          ) : null}
        </View>

        {/* Don't have an account? Sign up */}
        <View
          style={{
            marginTop: 26,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 13.5, color: colors.textMuted }}>{t.auth.dont_have_account}</Text>
          <Pressable onPress={() => router.replace('/(auth)/register')} hitSlop={6}>
            <Text style={{ fontSize: 13.5, color: colors.brandCoral, fontWeight: '700' }}>
              {' '}
              {t.auth.register}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

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
