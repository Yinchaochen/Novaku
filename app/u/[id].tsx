import { Redirect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '../../store/authStore';

// Universal/App Link target for https://postervia.app/u/{id}. Forwards to the
// in-app profile view. Logged-out deep taps are bounced to /login by the root
// auth gate (app/_layout.tsx), so here we just hold a spinner until that lands.
export default function SharedProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const userId = typeof params.id === 'string' ? params.id : null;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated || !userId) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F5F8' }}>
        <ActivityIndicator size="large" color="#F47C7C" />
      </View>
    );
  }

  return <Redirect href={`/users/${userId}` as never} />;
}
