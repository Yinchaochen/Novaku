import { zodResolver } from '@hookform/resolvers/zod';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod/v4';

import { AuthHeader } from '../../components/AuthHeader';
import { useLanguage } from '../../context/LanguageContext';
import { getApiErrorCode, useLogin } from '../../features/auth/useAuth';
import { useAppleLogin, useGoogleLogin } from '../../features/auth/useOAuth';

const schema = z.object({
  email: z.email(),
  password: z.string().min(8),
});
type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { t } = useLanguage();
  const login = useLogin();
  const google = useGoogleLogin();
  const apple = useAppleLogin();
  const loginErrorCode = getApiErrorCode(login.error);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: FormData) => {
    login.mutate(data, {
      onSuccess: () => router.replace('/(tabs)/tasks'),
    });
  };

  return (
    <View className="flex-1 bg-surface px-6 justify-center">
      <AuthHeader />

      <Text className="text-3xl font-bold text-primary mb-2">{t.app_name}</Text>
      <Text className="text-gray-500 mb-8">{t.auth.welcome}</Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-3 text-base"
            placeholder={t.auth.email}
            value={value ?? ''}
            onChangeText={onChange}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        )}
      />
      {errors.email && <Text className="text-danger text-sm mb-2">{errors.email.message}</Text>}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-6 text-base"
            placeholder={t.auth.password}
            value={value ?? ''}
            onChangeText={onChange}
            secureTextEntry
          />
        )}
      />
      {errors.password && <Text className="text-danger text-sm mb-2">{errors.password.message}</Text>}

      <Pressable className="mb-5 self-end" onPress={() => router.push('/(auth)/forgot-password')}>
        <Text className="text-sm font-medium text-primary">{t.auth.forgot_password}</Text>
      </Pressable>

      <Pressable
        className="bg-primary rounded-2xl px-4 py-4 items-center"
        onPress={handleSubmit(onSubmit)}
        disabled={login.isPending}
      >
        {login.isPending
          ? <ActivityIndicator color="#fff" />
          : <Text className="text-white font-bold text-base text-center">{t.auth.login}</Text>}
      </Pressable>

      {login.isError && (
        <Text className="text-danger text-center mt-3">
          {loginErrorCode === 'auth.invalid_credentials'
            ? t.auth.errors.invalid_credentials
            : loginErrorCode === 'auth.inactive'
              ? t.auth.errors.inactive
              : t.auth.errors.unknown}
        </Text>
      )}

      <Pressable className="mt-6 items-center" onPress={() => router.push('/(auth)/register')}>
        <Text className="text-primary">{t.auth.create_account}</Text>
      </Pressable>

      {/* Divider */}
      <View className="flex-row items-center gap-4 my-6">
        <View className="flex-1 h-px bg-gray-200" />
        <Text className="text-gray-400 text-sm">{t.auth.or}</Text>
        <View className="flex-1 h-px bg-gray-200" />
      </View>

      {/* Google */}
      <Pressable
        className="flex-row items-center justify-center bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-3 gap-3"
        onPress={() => google.promptAsync()}
        disabled={!google.request || google.isPending}
      >
        {google.isPending ? (
          <ActivityIndicator size="small" color="#5B67CA" />
        ) : (
          <>
            <View className="w-5 h-5 rounded-full items-center justify-center bg-white">
              <Text style={{ color: '#4285F4', fontWeight: '700', fontSize: 14 }}>G</Text>
            </View>
            <Text className="text-gray-700 font-medium text-base text-center flex-shrink">
              {t.auth.continue_with_google}
            </Text>
          </>
        )}
      </Pressable>

      {/* Apple — iOS only */}
      {Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={16}
          style={{ height: 48 }}
          onPress={apple.signIn}
        />
      )}

      {(google.isError || apple.isError) && (
        <Text className="text-danger text-center mt-3">{t.common.error}</Text>
      )}
    </View>
  );
}
