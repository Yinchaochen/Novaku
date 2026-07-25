import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { GradientButton } from '../../components/GradientButton';
import { OnboardingModal } from '../../components/OnboardingModal';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { StateBlock } from '../../components/StateBlock';
import { SurfaceCard } from '../../components/SurfaceCard';
import type { AuthUser } from '../../features/auth/useAuth';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, typography } from '../../theme/tokens';

const locationPendingUser: AuthUser = {
  id: 'city-location-gallery-user',
  display_id: '1234567890',
  email: 'city-gallery@postervia.app',
  display_name: 'Mira',
  avatar_url: null,
  locale: 'en',
  identity: 'newcomer',
  city: null,
  origin_city: null,
  arrival_stage: null,
  intent_tags: [],
  onboarding_completed: false,
  location_source: null,
  latitude: null,
  longitude: null,
  bio: null,
  tab_notes_public: true,
  tab_comments_public: true,
  tab_saves_public: true,
  tab_likes_public: true,
  is_staff: false,
  is_vianter_plus: false,
  search_visibility: 'open',
  profile_visibility: 'public',
  feed_mode: 'personalized',
  gender: null,
  buddy_publish_banned_at: null,
};

function StateHeading({ children }: { children: string }) {
  return <Text style={[typography.bodyStrong, { color: colors.textMain }]}>{children}</Text>;
}

export default function CityLocationGallery() {
  const [modalVisible, setModalVisible] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    setUser(locationPendingUser);
  }, [setUser]);

  return (
    <Screen
      header={(
        <PageHeader
          title="City and location"
          subtitle="Normal · long German · empty · loading · self · other"
        />
      )}
      scroll
      bottomGap={spacing['2xl']}
      contentStyle={{ paddingHorizontal: spacing.xl, gap: spacing['2xl'] }}
    >
      <View style={{ gap: spacing.md }}>
        <StateHeading>1. Normal — real city not chosen yet</StateHeading>
        <SurfaceCard tone="cream" padding={spacing.lg}>
          <StateBlock
            tone="neutral"
            icon="location-outline"
            title="Location pending"
            message="No fallback city is shown. The user can detect the current city or search worldwide."
          />
          <GradientButton
            label="Open real city selector"
            onPress={() => setModalVisible(true)}
            fullWidth
          />
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>2. Long German</StateHeading>
        <SurfaceCard tone="white" padding={spacing.lg}>
          <Text style={[typography.bodyStrong, { color: colors.textMain }]}>
            Suche nach deiner aktuellen Stadt und wähle anschließend den genauesten Treffer aus.
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm }]}>
            Standortzugriff ist freiwillig; die Stadt kann jederzeit manuell gesucht und geändert werden.
          </Text>
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>3. Empty</StateHeading>
        <StateBlock
          tone="neutral"
          icon="search-outline"
          title="No matching city"
          message="A more specific query is suggested without inventing a nearby city."
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>4. Loading</StateHeading>
        <SurfaceCard tone="white" padding={spacing.lg}>
          <ActivityIndicator color={colors.brandCoral} />
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm }]}>
            Searching cities…
          </Text>
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>5. Self — editable city</StateHeading>
        <StateBlock
          tone="success"
          icon="create-outline"
          title="Base in München"
          message="The owner can reopen the same selector from Profile and change the stored city."
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>6. Other — read-only city</StateHeading>
        <StateBlock
          tone="neutral"
          icon="person-outline"
          title="Base in München"
          message="Other users see the selected city only; location controls and coordinates stay private."
        />
      </View>

      <OnboardingModal
        visible={modalVisible}
        mode="edit"
        onDone={() => setModalVisible(false)}
        onCancel={() => setModalVisible(false)}
      />
    </Screen>
  );
}
