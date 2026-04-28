import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod/v4';

import { AuthHeader } from '../../components/AuthHeader';
import { useLanguage } from '../../context/LanguageContext';
import { getApiErrorCode, useForgotPassword } from '../../features/auth/useAuth';

const schema = z.object({
  email: z.email(),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const { t } = useLanguage();
  const forgotPassword = useForgotPassword();
  const errorCode = getApiErrorCode(forgotPassword.error);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = (data: FormData) => {
    forgotPassword.mutate(data);
  };

  if (forgotPassword.isSuccess) {
    return (
      <View className="flex-1 justify-center bg-surface px-6">
        <AuthHeader />
        <Text className="mb-2 text-3xl font-bold text-primary">{t.auth.check_email_title}</Text>
        <Text className="mb-8 text-base leading-6 text-gray-500">{t.auth.check_email_hint}</Text>

        <Pressable
          className="rounded-2xl bg-primary px-4 py-4 items-center"
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text className="text-base font-bold text-white text-center">{t.auth.back_to_login}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center bg-surface px-6">
      <AuthHeader />

      <Text className="mb-2 text-3xl font-bold text-primary">{t.auth.forgot_password_title}</Text>
      <Text className="mb-8 text-base leading-6 text-gray-500">{t.auth.forgot_password_hint}</Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="mb-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base"
            placeholder={t.auth.email}
            value={value ?? ''}
            onChangeText={onChange}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        )}
      />
      {errors.email && <Text className="mb-2 text-sm text-danger">{errors.email.message}</Text>}

      <Pressable
        className="rounded-2xl bg-primary px-4 py-4 items-center"
        onPress={handleSubmit(onSubmit)}
        disabled={forgotPassword.isPending}
      >
        {forgotPassword.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-bold text-white text-center">{t.auth.send_reset_link}</Text>
        )}
      </Pressable>

      {forgotPassword.isError && (
        <Text className="mt-3 text-center text-danger">
          {errorCode === 'auth.reset_email_unavailable'
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
