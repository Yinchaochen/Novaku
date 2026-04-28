import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod/v4';

import { AuthHeader } from '../../components/AuthHeader';
import { useLanguage } from '../../context/LanguageContext';
import {
  getApiErrorCode,
  useResetPassword,
  useVerifyResetPasswordToken,
} from '../../features/auth/useAuth';

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
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const routeToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const resetPassword = useResetPassword();
  const verifyToken = useVerifyResetPasswordToken(routeToken ?? null, Boolean(routeToken));
  const resetErrorCode = getApiErrorCode(resetPassword.error) ?? getApiErrorCode(verifyToken.error);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
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

  if (routeToken && verifyToken.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <ActivityIndicator size="large" color="#5B67CA" />
      </View>
    );
  }

  if (routeToken && verifyToken.isError) {
    return (
      <View className="flex-1 justify-center bg-surface px-6">
        <AuthHeader />
        <Text className="mb-2 text-3xl font-bold text-primary">{t.auth.reset_password_title}</Text>
        <Text className="mb-8 text-base leading-6 text-danger">
          {resetErrorCode === 'auth.reset_token_expired'
            ? t.auth.errors.reset_token_expired
            : t.auth.errors.reset_token_invalid}
        </Text>
        <Pressable
          className="rounded-2xl bg-primary px-4 py-4 items-center"
          onPress={() => router.replace('/(auth)/forgot-password')}
        >
          <Text className="text-base font-bold text-white text-center">{t.auth.send_reset_link}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center bg-surface px-6">
      <AuthHeader />

      <Text className="mb-2 text-3xl font-bold text-primary">{t.auth.reset_password_title}</Text>
      <Text className="mb-8 text-base leading-6 text-gray-500">{t.auth.reset_password_hint}</Text>

      {!routeToken ? (
        <>
          <Controller
            control={control}
            name="token"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="mb-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base"
                placeholder={t.auth.reset_code}
                value={value ?? ''}
                onChangeText={onChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
          />
          {errors.token && <Text className="mb-2 text-sm text-danger">{t.auth.errors.reset_token_invalid}</Text>}
        </>
      ) : null}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="mb-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base"
            placeholder={t.auth.new_password}
            value={value ?? ''}
            onChangeText={onChange}
            secureTextEntry
          />
        )}
      />
      {errors.password && <Text className="mb-2 text-sm text-danger">{errors.password.message}</Text>}

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="mb-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base"
            placeholder={t.auth.confirm_password}
            value={value ?? ''}
            onChangeText={onChange}
            secureTextEntry
          />
        )}
      />
      {errors.confirmPassword && (
        <Text className="mb-2 text-sm text-danger">
          {errors.confirmPassword.message === 'password_mismatch'
            ? t.auth.errors.password_mismatch
            : errors.confirmPassword.message}
        </Text>
      )}

      <Pressable
        className="rounded-2xl bg-primary px-4 py-4 items-center"
        onPress={handleSubmit(onSubmit)}
        disabled={resetPassword.isPending}
      >
        {resetPassword.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-bold text-white text-center">{t.auth.reset_password_submit}</Text>
        )}
      </Pressable>

      {resetPassword.isError && (
        <Text className="mt-3 text-center text-danger">
          {resetErrorCode === 'auth.reset_token_expired'
            ? t.auth.errors.reset_token_expired
            : resetErrorCode === 'auth.reset_token_invalid'
              ? t.auth.errors.reset_token_invalid
              : resetErrorCode === 'auth.reset_email_unavailable'
                ? t.auth.errors.reset_email_unavailable
                : t.auth.errors.unknown}
        </Text>
      )}

      <Pressable className="mt-6 items-center" onPress={() => router.replace('/(auth)/login')}>
        <Text className="text-primary">{t.auth.back_to_login}</Text>
      </Pressable>
    </View>
  );
}
