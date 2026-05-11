import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
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
import { getApiErrorCode, useForgotPassword } from '../../features/auth/useAuth';
import { tap } from '../../lib/haptics';
import { colors } from '../../theme/tokens';

const HERO_YELLOW = '#FFD17E';
const INPUT_FILL = '#FFE9A8';

const schema = z.object({
  email: z.email(),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const forgotPassword = useForgotPassword();
  const errorCode = getApiErrorCode(forgotPassword.error);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = (data: FormData) => {
    forgotPassword.mutate(data);
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
              {t.auth.forgot_password_title}
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
        {forgotPassword.isSuccess ? (
          <>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold',
                fontSize: 26,
                fontWeight: '800',
                color: colors.textBrown,
                letterSpacing: -0.3,
                marginBottom: 10,
              }}
            >
              {t.auth.check_email_title}
            </Text>
            <Text style={{ fontSize: 14, lineHeight: 21, color: colors.textMuted, marginBottom: 28 }}>
              {t.auth.check_email_hint}
            </Text>

            <PrimaryCta
              label={t.auth.back_to_login}
              onPress={() => router.replace('/(auth)/login')}
            />
          </>
        ) : (
          <>
            <Text style={{ fontSize: 14, lineHeight: 21, color: colors.textMuted, marginBottom: 24 }}>
              {t.auth.forgot_password_hint}
            </Text>

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

            <View style={{ marginTop: 26 }}>
              <PrimaryCta
                label={t.auth.send_reset_link}
                onPress={handleSubmit(onSubmit)}
                loading={forgotPassword.isPending}
              />
            </View>

            {forgotPassword.isError ? (
              <Text style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: colors.danger }}>
                {errorCode === 'auth.reset_email_unavailable'
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
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PrimaryCta({
  label,
  onPress,
  loading,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <View
      style={{
        height: 56,
        alignSelf: 'stretch',
        borderRadius: 28,
        backgroundColor: '#FF8F7E',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: loading ? 0.7 : 1,
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
          onPress();
        }}
        disabled={loading}
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
        {loading ? (
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
            {label}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
