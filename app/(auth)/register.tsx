import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { z } from 'zod/v4';

import { AuthHeader } from '../../components/AuthHeader';
import { useLanguage } from '../../context/LanguageContext';
import { getApiErrorCode, useRegister } from '../../features/auth/useAuth';

const schema = z.object({
  email: z.email(),
  password: z.string().min(8),
  display_name: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { t, langCode } = useLanguage();
  const register = useRegister();
  const registerErrorCode = getApiErrorCode(register.error);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      display_name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: FormData) => {
    register.mutate(
      { ...data, identity: 'newcomer', locale: langCode },
      { onSuccess: () => router.replace('/(tabs)/tasks') }
    );
  };

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="px-6 py-12">
      <AuthHeader />

      <Text className="text-3xl font-bold text-primary mb-2 mt-10">{t.app_name}</Text>
      <Text className="text-gray-500 mb-8">{t.auth.create_account}</Text>

      {(['display_name', 'email', 'password'] as const).map((field) => (
        <Controller
          key={field}
          control={control}
          name={field}
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-3 text-base"
              placeholder={t.auth[field]}
              value={value ?? ''}
              onChangeText={onChange}
              secureTextEntry={field === 'password'}
              autoCapitalize="none"
              keyboardType={field === 'email' ? 'email-address' : 'default'}
            />
          )}
        />
      ))}

      <Pressable
        className="bg-primary rounded-2xl px-4 py-4 items-center mt-3"
        onPress={handleSubmit(onSubmit)}
        disabled={register.isPending}
      >
        {register.isPending
          ? <ActivityIndicator color="#fff" />
          : <Text className="text-white font-bold text-base text-center">{t.auth.register}</Text>}
      </Pressable>

      {register.isError && (
        <Text className="text-danger text-center mt-3">
          {registerErrorCode === 'auth.email_taken'
            ? t.auth.errors.email_taken
            : t.auth.errors.unknown}
        </Text>
      )}

      <Pressable className="mt-6 items-center" onPress={() => router.back()}>
        <Text className="text-primary">{t.common.back}</Text>
      </Pressable>
    </ScrollView>
  );
}
