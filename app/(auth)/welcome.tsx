import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/tokens';

const REDIRECT_DELAY_MS = 1000;
const LOGO_MARK_SIZE = 164;

/**
 * Welcome / brand-reveal screen. Shown once on cold start as a 1-second
 * splash-style intro, then auto-redirects:
 *   - authenticated → /(tabs)/plaza
 *   - not authenticated → /(auth)/login
 *
 * No CTA buttons — the page is purely a brand moment, not a hub. Sign-up
 * still lives as a link inside /(auth)/login.
 */
export default function WelcomeScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  // Wait for cold-start hydrate to finish before deciding where to send the
  // user — otherwise a slow SecureStore read could fire the timer with a
  // stale `isAuthenticated=false` and bounce a logged-in user to /login.
  useEffect(() => {
    if (!hasHydrated) return;
    const timer = setTimeout(() => {
      router.replace(isAuthenticated ? '/(tabs)/plaza' : '/(auth)/login');
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hasHydrated, isAuthenticated]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.brandCoral }}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#FA8E84', '#F67673', '#E5605C']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={{
          flex: 1,
          paddingHorizontal: 32,
          paddingTop: Math.max(insets.top + 24, 56),
          paddingBottom: Math.max(insets.bottom + 28, 36),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <Image
            source={require('../../assets/images/UI/1.png')}
            style={{
              width: LOGO_MARK_SIZE,
              height: LOGO_MARK_SIZE,
              marginBottom: 18,
            }}
            contentFit="contain"
          />

          <Text
            style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold',
              fontSize: 38,
              fontWeight: '800',
              letterSpacing: 1.2,
              lineHeight: 44,
            }}
          >
            <Text style={{ color: '#FFD75E' }}>POSTER</Text>
            <Text style={{ color: '#FFEDB5' }}>VIA</Text>
          </Text>

          <Text
            style={{
              marginTop: 14,
              fontSize: 14,
              lineHeight: 20,
              color: 'rgba(255,255,255,0.92)',
              textAlign: 'center',
              paddingHorizontal: 8,
              letterSpacing: 0.2,
            }}
          >
            {t.auth.welcome_tagline}
          </Text>
        </View>
      </View>
    </View>
  );
}
