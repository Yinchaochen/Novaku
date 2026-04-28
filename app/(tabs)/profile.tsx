import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { IdentityModal, IDENTITY_CONFIRMED_KEY } from '../../components/IdentityModal';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import * as secureStore from '../../lib/secureStore';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
  const { t } = useLanguage();
  const { user, logout } = useAuthStore();
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const identityLabel = user ? t.auth[`identity_${user.identity}`] : '';

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const openIdentityModal = async () => {
    await secureStore.deleteItemAsync(IDENTITY_CONFIRMED_KEY);
    setShowIdentityModal(true);
  };

  return (
    <View className="flex-1 bg-surface">
      <PageHeader title={t.profile.title} />

      <View className="px-5">
        <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-900">{user?.display_name}</Text>
          <Text className="text-gray-500 text-sm">{user?.email}</Text>
          <View className="mt-3 flex-row gap-2 items-center">
            <View className="bg-primary/10 rounded-full px-3 py-1">
              <Text className="text-primary text-xs font-medium">{identityLabel}</Text>
            </View>
            <View className="bg-gray-100 rounded-full px-3 py-1">
              <Text className="text-gray-600 text-xs">{user?.city}</Text>
            </View>
            <Pressable
              onPress={openIdentityModal}
              className="bg-gray-100 rounded-full px-3 py-1"
            >
              <Text className="text-gray-500 text-xs">{t.profile.change_identity ?? 'Change'}</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          className="bg-danger/10 rounded-2xl p-4 items-center"
          onPress={handleLogout}
        >
          <Text className="text-danger font-bold">{t.auth.logout}</Text>
        </Pressable>
      </View>

      <IdentityModal
        visible={showIdentityModal}
        currentIdentity={user?.identity}
        onDone={() => setShowIdentityModal(false)}
      />
    </View>
  );
}
