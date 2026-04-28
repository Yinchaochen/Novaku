import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';

import { IdentityModal, IDENTITY_CONFIRMED_KEY } from '../../components/IdentityModal';
import { useLanguage } from '../../context/LanguageContext';
import * as secureStore from '../../lib/secureStore';
import { useAuthStore } from '../../store/authStore';

export default function TabsLayout() {
  const { t } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const [showIdentityModal, setShowIdentityModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    secureStore.getItemAsync(IDENTITY_CONFIRMED_KEY).then((confirmed) => {
      if (!confirmed) setShowIdentityModal(true);
    });
  }, [user?.id]);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#5B67CA',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#F3F4F6',
            paddingBottom: 8,
            height: 60,
          },
        }}
      >
        <Tabs.Screen
          name="tasks"
          options={{
            title: t.tasks.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="checkmark-circle-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="plaza"
          options={{
            title: t.plaza.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="compass-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="documents"
          options={{
            title: t.documents.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t.profile.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      <IdentityModal
        visible={showIdentityModal}
        currentIdentity={user?.identity}
        onDone={() => setShowIdentityModal(false)}
      />
    </>
  );
}
