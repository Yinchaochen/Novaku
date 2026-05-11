import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChalkIcon, ChalkIconName } from '../../components/ChalkIcon';
import { OnboardingModal } from '../../components/OnboardingModal';
import { useLanguage } from '../../context/LanguageContext';
import { tap } from '../../lib/haptics';
import { useAuthStore } from '../../store/authStore';
import { colors, gradients, shadows } from '../../theme/tokens';

const ACTIVE_TINT = colors.brandCoral;
const INACTIVE_TINT = '#9A867D';

interface FloatingIconProps {
  name: ChalkIconName;
  focused: boolean;
}

function FloatingIcon({ name, focused }: FloatingIconProps) {
  return (
    <View
      style={{
        width: 44,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {focused ? (
        <LinearGradient
          colors={['rgba(255, 200, 175, 0.55)', 'rgba(255, 170, 122, 0.30)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <ChalkIcon
        name={name}
        size={focused ? 26 : 24}
        color={focused ? ACTIVE_TINT : INACTIVE_TINT}
      />
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowOnboardingModal(false);
      return;
    }
    setShowOnboardingModal(!user.onboarding_completed);
  }, [user?.id, user?.onboarding_completed]);

  const tabBarBottomPadding = Math.max(insets.bottom, 12);
  const tabBarHeight = 64 + tabBarBottomPadding;

  return (
    <>
      <Tabs
        screenListeners={{
          tabPress: () => {
            tap('selection');
          },
        }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: ACTIVE_TINT,
          tabBarInactiveTintColor: INACTIVE_TINT,
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.2,
            marginTop: -2,
          },
          tabBarItemStyle: {
            paddingTop: 6,
          },
          tabBarBackground: () => (
            <View style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }]}>
              {/* iOS: real frosted blur underneath. Android: skip — perf + reliability. */}
              {Platform.OS === 'ios' ? (
                <BlurView intensity={32} tint="light" style={StyleSheet.absoluteFill} />
              ) : null}
              {/* Glass body — lighter on iOS so BlurView shows through, opaque on Android. */}
              <LinearGradient
                colors={
                  Platform.OS === 'ios'
                    ? ['rgba(255, 250, 245, 0.55)', 'rgba(255, 244, 235, 0.40)']
                    : ['#FFFAF2', '#FFFAF2']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Top edge highlight */}
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 24,
                  right: 24,
                  top: 0,
                  height: 1,
                  backgroundColor: 'rgba(255,255,255,0.85)',
                  borderRadius: 1,
                }}
              />
            </View>
          ),
          tabBarStyle: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: tabBarHeight,
            paddingBottom: tabBarBottomPadding,
            paddingTop: 4,
            borderTopWidth: 0,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: 'transparent',
            elevation: 0,
            shadowOpacity: 0,
            ...Platform.select({
              ios: {
                shadowColor: '#7A4A2C',
                shadowOpacity: 0.12,
                shadowRadius: 28,
                shadowOffset: { width: 0, height: -8 },
              },
              android: {
                elevation: 0,
              },
            }),
          },
        }}
      >
        <Tabs.Screen
          name="tasks"
          options={{
            title: t.tasks.title,
            tabBarIcon: ({ focused }) => <FloatingIcon name="odyssey" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="plaza"
          options={{
            title: t.plaza.title,
            tabBarIcon: ({ focused }) => <FloatingIcon name="plaza" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="social"
          options={{
            title: t.social.title,
            tabBarIcon: ({ focused }) => <FloatingIcon name="social" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="buddy"
          options={{
            title: t.buddy.title,
            tabBarIcon: ({ focused }) => <FloatingIcon name="scribe" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t.profile.title,
            tabBarIcon: ({ focused }) => <FloatingIcon name="profile" focused={focused} />,
          }}
        />
      </Tabs>

      <OnboardingModal
        visible={showOnboardingModal}
        mode="required"
        onDone={() => setShowOnboardingModal(false)}
      />
    </>
  );
}
// Tokens reference avoids unused-import warning when only the gradient palette is consumed.
void gradients;
