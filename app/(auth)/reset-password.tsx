import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod/v4';

import { useLanguage } from '../../context/LanguageContext';
import {
  getApiErrorCode,
  useResetPassword,
  useVerifyResetPasswordToken,
} from '../../features/auth/useAuth';
import { tap } from '../../lib/haptics';
import { colors, gradients, shadows } from '../../theme/tokens';

const HERO_YELLOW = '#FFD17E';
const INPUT_FILL = '#FFE9A8';

const schema = z
  .object({
    token: z.string().min(20),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'password_mismatch',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const routeToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const resetPassword = useResetPassword();
  const verifyToken = useVerifyResetPasswordToken(routeToken ?? null, Boolean(routeToken));
  const resetErrorCode =
    getApiErrorCode(resetPassword.error) ?? getApiErrorCode(verifyToken.error);

  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      token: routeToken ?? '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = (data: FormData) => {
    resetPassword.mutate(
      {
        token: routeToken ?? data.token,
        password: data.password,
      },
      {
        onSuccess: () => {
          router.replace('/(auth)/login');
        },
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

  // Fetching the token state — soft full-screen spinner with yellow band still
  // present so navigation stays consistent with the rest of the auth flow.
  if (routeToken && verifyToken.isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFAF2' }}>
        <StatusBar style="light" />
        <Hero
          title={t.auth.set_password_title}
          insetsTop={insets.top}
          onBack={() => router.back()}
          backLabel={t.common.back}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.brandCoral} />
        </View>
      </View>
    );
  }

  // Token invalid / expired — surface the error and let user request a new
  // reset link. We intentionally still show the same yellow Hero so the user
  // doesn't lose their bearings.
  if (routeToken && verifyToken.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFAF2' }}>
        <StatusBar style="light" />
        <Hero
          title={t.auth.set_password_title}
          insetsTop={insets.top}
          onBack={() => router.back()}
          backLabel={t.common.back}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 28, paddingBottom: 48 }}
        >
          <Text style={{ fontSize: 14, lineHeight: 21, color: colors.danger, marginBottom: 24 }}>
            {resetErrorCode === 'auth.reset_token_expired'
              ? t.auth.errors.reset_token_expired
              : t.auth.errors.reset_token_invalid}
          </Text>
          <PrimaryCta
            label={t.auth.send_reset_link}
            onPress={() => router.replace('/(auth)/forgot-password')}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFAF2' }}>
      <StatusBar style="light" />

      <Hero
        title={t.auth.set_password_title}
        insetsTop={insets.top}
        onBack={() => router.back()}
        backLabel={t.common.back}
      />

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
        <Text style={{ fontSize: 14, lineHeight: 21, color: colors.textMuted, marginBottom: 28 }}>
          {t.auth.set_password_hint}
        </Text>

        {/* Optional manual token entry (when the user types it from the email) */}
        {!routeToken ? (
          <>
            <Text style={labelStyle}>{t.auth.reset_code}</Text>
            <Controller
              control={control}
              name="token"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={inputBoxStyle}
                  placeholder={t.auth.reset_code}
                  placeholderTextColor="#A89A92"
                  value={value ?? ''}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}
            />
            {errors.token ? (
              <Text style={{ marginTop: 4, fontSize: 12, color: colors.danger }}>
                {t.auth.errors.reset_token_invalid}
              </Text>
            ) : null}
            <View style={{ height: 18 }} />
          </>
        ) : null}

        {/* Password */}
        <Text style={labelStyle}>{t.auth.new_password}</Text>
        <View style={{ position: 'relative' }}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[inputBoxStyle, { paddingRight: 48 }]}
                placeholder={t.auth.new_password}
                placeholderTextColor="#A89A92"
                value={value ?? ''}
                onChangeText={onChange}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
              />
            )}
          />
          <Pressable
            onPress={() => setShowPwd((v) => !v)}
            hitSlop={8}
            style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}
          >
            <Ionicons
              name={showPwd ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.brandCoral}
            />
          </Pressable>
        </View>
        {errors.password ? (
          <Text style={{ marginTop: 4, fontSize: 12, color: colors.danger }}>
            {errors.password.message}
          </Text>
        ) : null}

        {/* Confirm password */}
        <Text style={[labelStyle, { marginTop: 18 }]}>{t.auth.confirm_password}</Text>
        <View style={{ position: 'relative' }}>
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[inputBoxStyle, { paddingRight: 48 }]}
                placeholder={t.auth.confirm_password}
                placeholderTextColor="#A89A92"
                value={value ?? ''}
                onChangeText={onChange}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
            )}
          />
          <Pressable
            onPress={() => setShowConfirm((v) => !v)}
            hitSlop={8}
            style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}
          >
            <Ionicons
              name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.brandCoral}
            />
          </Pressable>
        </View>
        {errors.confirmPassword ? (
          <Text style={{ marginTop: 4, fontSize: 12, color: colors.danger }}>
            {errors.confirmPassword.message === 'password_mismatch'
              ? t.auth.errors.password_mismatch
              : errors.confirmPassword.message}
          </Text>
        ) : null}

        {/* Create New Password — coral pill, narrower than full width to match
            the YumQuick reference (button feels lighter when not max-stretched) */}
        <View style={{ marginTop: 32, alignItems: 'center' }}>
          <PrimaryCta
            label={t.auth.create_new_password}
            onPress={handleSubmit(onSubmit)}
            loading={resetPassword.isPending}
            inline
          />
        </View>

        {resetPassword.isError ? (
          <Text style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: colors.danger }}>
            {resetErrorCode === 'auth.reset_token_expired'
              ? t.auth.errors.reset_token_expired
              : resetErrorCode === 'auth.reset_token_invalid'
              ? t.auth.errors.reset_token_invalid
              : resetErrorCode === 'auth.reset_email_unavailable'
              ? t.auth.errors.reset_email_unavailable
              : t.auth.errors.unknown}
          </Text>
        ) : null}

        <Pressable
          onPress={() => router.replace('/(auth)/login')}
          style={{ marginTop: 22, alignItems: 'center' }}
          hitSlop={6}
        >
          <Text style={{ fontSize: 13.5, color: colors.brandCoral, fontWeight: '700' }}>
            {t.auth.back_to_login}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Hero({
  title,
  insetsTop,
  onBack,
  backLabel,
}: {
  title: string;
  insetsTop: number;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <View
      style={{
        backgroundColor: HERO_YELLOW,
        paddingTop: Math.max(insetsTop + 14, 36),
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
            onBack();
          }}
          hitSlop={12}
          style={({ pressed }) => [{ padding: 4 }, pressed ? { opacity: 0.7 } : null]}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
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
            {title}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PrimaryCta({
  label,
  onPress,
  loading,
  inline,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  inline?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        tap('medium');
        onPress();
      }}
      disabled={loading}
      style={({ pressed }) => [
        {
          paddingVertical: 16,
          paddingHorizontal: inline ? 36 : 24,
          borderRadius: 999,
          alignItems: 'center',
          overflow: 'hidden',
          alignSelf: inline ? 'auto' : 'stretch',
          opacity: loading ? 0.7 : 1,
          ...shadows.cta,
        },
        pressed && !loading ? { transform: [{ scale: 0.98 }] } : null,
      ]}
    >
      <LinearGradient
        colors={gradients.brandCta as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_700Bold',
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: 16,
            letterSpacing: 0.3,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
