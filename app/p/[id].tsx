import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '../../context/LanguageContext';
import { CommunityPostDetailModal } from '../../features/community/CommunityPostDetailModal';
import { useCommunityPost } from '../../features/community/useCommunity';
import { useAuthStore } from '../../store/authStore';

// Universal/App Link target for https://postervia.app/p/{id}. Opens the shared
// post directly. Logged-out deep taps are bounced to /login by the root auth
// gate (app/_layout.tsx), so here we just show a spinner until that lands.
export default function SharedPostScreen() {
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ id: string }>();
  const postId = typeof params.id === 'string' ? params.id : null;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useCommunityPost(postId, Boolean(postId) && isAuthenticated);

  const goHome = () => router.replace('/plaza');

  if (!isAuthenticated || query.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F5F8' }}>
        <ActivityIndicator size="large" color="#F47C7C" />
      </SafeAreaView>
    );
  }

  if (!postId || query.isError || !query.data) {
    return (
      <SafeAreaView
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F5F8', paddingHorizontal: 32 }}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151', textAlign: 'center' }}>
          {t.plaza.shared_post_unavailable}
        </Text>
        <Pressable
          onPress={goHome}
          style={{ marginTop: 16, borderRadius: 999, backgroundColor: '#F47C7C', paddingHorizontal: 22, paddingVertical: 12 }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{t.plaza.shared_post_go_home}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return <CommunityPostDetailModal post={query.data} visible onClose={goHome} />;
}
