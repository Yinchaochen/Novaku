import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground } from '../../components/AppBackground';
import { GlassCard } from '../../components/GlassCard';
import { LangPill } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { SectionLabel } from '../../components/SectionLabel';
import { StackedButton } from '../../components/StackedButton';
import { useLanguage } from '../../context/LanguageContext';
import { useMe } from '../../features/auth/useAuth';
import * as secureStore from '../../lib/secureStore';
import { useAuthStore } from '../../store/authStore';
import { PersonalOdysseyCard } from '../../features/community/PersonalTaskCard';
import { usePersonalOdysseys } from '../../features/community/useCommunity';
import { OdysseyCard, OdysseyNode, OdysseyState } from '../../features/tasks/TaskCard';
import { OdysseyDetailModal } from '../../features/tasks/OdysseyDetailModal';
import { useDag } from '../../features/tasks/useTasks';
import { useIsVianterPlus } from '../../features/billing/useBilling';
import { colors } from '../../theme/tokens';

interface CanonicalSection {
  title: string;
  data: OdysseyNode[];
  dim?: boolean;
}

interface CelebrationState {
  visible: boolean;
  title: Record<string, string>;
  type: OdysseyNode['type'];
}

const TAB_BAR_BASE_HEIGHT = 64;
const HISTORY_PILL_HEIGHT = 64;
const HISTORY_FLOATING_GAP = 16;

export default function TasksScreen() {
  const { t, langCode } = useLanguage();
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, 12);
  const dag = useDag() ?? {
    data: undefined,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: async () => undefined,
  };
  const personal = usePersonalOdysseys() ?? {
    data: undefined,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: async () => undefined,
  };
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const [detailTarget, setDetailTarget] = useState<{ node: OdysseyNode; state: OdysseyState | undefined } | null>(null);
  const isPlus = useIsVianterPlus();
  const user = useAuthStore((s) => s.user);
  const me = useMe();
  const [settledBannerVisible, setSettledBannerVisible] = useState(false);

  // When the user is settled and hasn't dismissed the welcome banner yet,
  // surface it. Per-user SecureStore key so a fresh login on the same device
  // still gets the celebration.
  useEffect(() => {
    if (!user || user.arrival_stage !== 'settled') {
      setSettledBannerVisible(false);
      return;
    }
    secureStore.getItemAsync(`settled_banner_dismissed_${user.id}`).then((flag) => {
      if (!flag) setSettledBannerVisible(true);
    });
  }, [user?.id, user?.arrival_stage]);

  const dismissSettledBanner = async () => {
    if (!user) return;
    await secureStore.setItemAsync(`settled_banner_dismissed_${user.id}`, '1');
    setSettledBannerVisible(false);
  };

  if (dag.isLoading && !dag.data && personal.isLoading && !personal.data) {
    return (
      <AppBackground style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.brandCoral} />
      </AppBackground>
    );
  }

  if (dag.isError && !dag.data && personal.isError && !personal.data) {
    return (
      <AppBackground style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.danger, fontSize: 14 }}>{t.common.error}</Text>
      </AppBackground>
    );
  }

  const allNodes: OdysseyNode[] = dag.data?.nodes ?? [];
  const states: OdysseyState[] = dag.data?.states ?? [];
  const personalTasks = personal.data ?? [];
  const stateMap = Object.fromEntries(states.map((state) => [state.odyssey_node_id, state]));

  // Done/discarded/skipped tasks belong to History — never the active list.
  const HISTORICAL_STATUSES = new Set(['done', 'discarded', 'skipped']);
  const isHistorical = (node: OdysseyNode) =>
    HISTORICAL_STATUSES.has(stateMap[node.id]?.status ?? 'locked');

  const mainNodes = allNodes.filter((node) => node.type === 'main' && !isHistorical(node));
  const sideNodes = allNodes.filter((node) => node.type === 'side' && !isHistorical(node));

  const byStatus = (nodeList: OdysseyNode[], status: string) =>
    nodeList.filter((node) => stateMap[node.id]?.status === status);

  const mainSections: CanonicalSection[] = [
    { title: t.tasks.section_progress, data: byStatus(mainNodes, 'in_progress') },
    { title: t.tasks.section_available, data: byStatus(mainNodes, 'available') },
    { title: t.tasks.section_locked, data: byStatus(mainNodes, 'locked'), dim: true },
  ].filter((section) => section.data.length > 0);

  const visiblePersonalCount = personalTasks.filter((task) => task.status !== 'done').length;
  const hasSideContent = sideNodes.length > 0 || visiblePersonalCount > 0;

  const showError = dag.isError || personal.isError;
  const refreshAll = () => {
    void dag.refetch();
    void personal.refetch();
    void me.refetch();
  };

  return (
    <AppBackground>
      {/* Yellow band hero — matches the YumQuick-style consistent header
          shipped on auth pages and the Buddy tab. White title + LangPill on
          right; AppBackground cream takes over below the curved 32px corner. */}
      <View
        style={{
          backgroundColor: '#FFD17E',
          paddingTop: Math.max(insets.top + 14, 36),
          paddingBottom: 22,
          paddingHorizontal: 22,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold',
              fontSize: 26,
              fontWeight: '800',
              color: '#FFFFFF',
              letterSpacing: -0.3,
            }}
          >
            {t.tasks.title}
          </Text>
          <LangPill />
        </View>
      </View>

      {showError ? (
        <Text className="px-5 pt-2 pb-2 text-xs text-danger">{t.common.error}</Text>
      ) : null}

      {settledBannerVisible && user?.city ? (
        <GlassCard
          tone="cream"
          radiusKey="2xl"
          padding={16}
          style={{ marginHorizontal: 20, marginTop: 6, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
        >
          <Text style={{ fontSize: 22 }}>🎉</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textMain, marginBottom: 4 }}>
              {t.tasks.settled_banner_title.replace(
                '{city}',
                user.city.charAt(0).toUpperCase() + user.city.slice(1),
              )}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 19 }}>
              {t.tasks.settled_banner_body}
            </Text>
          </View>
          <Pressable onPress={dismissSettledBanner} hitSlop={12}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </GlassCard>
      ) : null}

      {/* Main / Side SegmentedControl and progress card hidden during the
          settled-vs-just_arrived simplification — restore later if we bring
          the dual-track UI back. */}

      <View style={{ flex: 1 }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: tabBarHeight + HISTORY_PILL_HEIGHT + HISTORY_FLOATING_GAP + 32,
          }}
          refreshControl={
            <RefreshControl
              refreshing={(dag.isFetching && !dag.isLoading) || (personal.isFetching && !personal.isLoading)}
              onRefresh={refreshAll}
              tintColor={colors.brandCoral}
            />
          }
        >
          <Pressable
            onPress={() => router.push('/(tabs)/plaza')}
            style={({ pressed }) => [
              { marginBottom: 14, transform: pressed ? [{ scale: 0.985 }] : [] },
            ]}
          >
            <GlassCard tone="white" radiusKey="2xl" padding={16}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    height: 48,
                    width: 48,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                    backgroundColor: '#FFE0CC',
                  }}
                >
                  <Ionicons name="compass-outline" size={22} color={colors.brandCoral} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textMain, marginBottom: 2 }}>
                    {t.tasks.explore_plaza_title}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }} numberOfLines={2}>
                    {t.tasks.explore_plaza_body}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
              </View>
            </GlassCard>
          </Pressable>

          {mainSections.map((section) => (
              <View key={section.title}>
                <View style={{ marginTop: 18, marginBottom: 12 }}>
                  <SectionLabel tone="muted">{section.title}</SectionLabel>
                </View>
                {section.data.map((node) => (
                  <View key={node.id} style={{ marginBottom: 12 }}>
                    <OdysseyCard
                      node={node}
                      state={stateMap[node.id]}
                      onRefresh={refreshAll}
                      onTaskComplete={(task) => {
                        setCelebration({ visible: true, title: task.title, type: task.type });
                      }}
                    />
                  </View>
                ))}
              </View>
            ))}

            {hasSideContent ? (
              <>
                <View style={{ marginTop: 18, marginBottom: 12 }}>
                  <SectionLabel tone="coral">{t.tasks.side_section_progress}</SectionLabel>
                </View>
                {sideNodes.map((node) => (
                  <View key={node.id} style={{ marginBottom: 12 }}>
                    <OdysseyCard
                      node={node}
                      state={stateMap[node.id]}
                      onRefresh={refreshAll}
                      onTaskComplete={(task) => {
                        setCelebration({ visible: true, title: task.title, type: task.type });
                      }}
                      onPressDetail={(n, s) => setDetailTarget({ node: n, state: s })}
                    />
                  </View>
                ))}
                {personalTasks
                  .filter((task) => task.status !== 'done')
                  .map((task) => (
                    <View key={task.id} style={{ marginBottom: 12 }}>
                      <PersonalOdysseyCard task={task} />
                    </View>
                  ))}
                {/* Hidden until Postervia+ launches publicly. Restore by removing `false &&`. */}
                {false && !isPlus && allNodes.length >= 5 ? (
                  <Pressable
                    onPress={() => router.push('/billing/subscribe' as never)}
                    style={({ pressed }) => [
                      { marginTop: 14, transform: pressed ? [{ scale: 0.985 }] : [] },
                    ]}
                  >
                    <GlassCard tone="cream" radiusKey="2xl" padding={16}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          style={{
                            height: 38,
                            width: 38,
                            borderRadius: 19,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                            backgroundColor: colors.brandCoral,
                          }}
                        >
                          <Ionicons name="diamond-outline" size={18} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textMain }}>
                            {t.billing.paywall_tasks_headline}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }} numberOfLines={2}>
                            {t.billing.paywall_tasks_body}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.brandCoral} />
                      </View>
                    </GlassCard>
                  </Pressable>
                ) : null}
              </>
            ) : null}
        </ScrollView>
      </View>

      {/* Floating History pill above the tab bar. */}
      <View
        style={{
          position: 'absolute',
          left: 44,
          right: 44,
          bottom: tabBarHeight + HISTORY_FLOATING_GAP,
          zIndex: 40,
        }}
      >
        <View
          style={{
            width: '100%',
            height: HISTORY_PILL_HEIGHT,
            borderRadius: 32,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: 'rgba(98, 57, 40, 0.13)',
            shadowColor: '#7A4A2C',
            shadowOpacity: 0.08,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
          }}
        >
          <Pressable
            onPress={() => router.push('/odyssey-history' as never)}
            accessibilityRole="button"
            accessibilityLabel={t.tasks.history}
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={{
              height: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="time-outline" size={20} color={colors.brandPeach} />
            <Text
              style={{
                marginLeft: 8,
                fontSize: 15,
                fontWeight: '700',
                color: colors.brandPeach,
                letterSpacing: 0.2,
              }}
            >
              {t.tasks.history}
            </Text>
          </View>
        </View>
      </View>

      <CelebrationOverlay
        visible={celebration?.visible === true}
        taskTitle={celebration?.title?.[langCode] ?? celebration?.title?.en ?? celebration?.title?.zh ?? ''}
        taskTypeLabel={celebration?.type === 'side' ? t.tasks.type_side : t.tasks.type_main}
        completedLabel={t.tasks.celebration_completed_label}
        title={t.tasks.celebration_title}
        message={t.tasks.celebration_message}
        closeLabel={t.tasks.celebration_close}
        onClose={() => setCelebration(null)}
      />

      <OdysseyDetailModal
        visible={detailTarget !== null}
        node={detailTarget?.node ?? null}
        state={detailTarget?.state}
        onClose={() => setDetailTarget(null)}
        onTaskComplete={(task) => {
          setCelebration({ visible: true, title: task.title, type: task.type });
        }}
      />
    </AppBackground>
  );
}

function CelebrationOverlay({
  visible,
  taskTitle,
  taskTypeLabel,
  completedLabel,
  title,
  message,
  closeLabel,
  onClose,
}: {
  visible: boolean;
  taskTitle: string;
  taskTypeLabel: string;
  completedLabel: string;
  title: string;
  message: string;
  closeLabel: string;
  onClose: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.5);
    }
  }, [visible, opacity, scale]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 50,
          padding: 24,
          opacity,
        },
      ]}
    >
      <Animated.View
        style={[
          {
            width: '100%',
            maxWidth: 340,
            alignItems: 'center',
            borderRadius: 32,
            backgroundColor: '#fff',
            padding: 24,
            transform: [{ scale }],
          },
        ]}
      >
        <Image
          source={require('../../assets/images/celebration.png')}
          style={{ width: 200, height: 200, marginBottom: 16 }}
          contentFit="contain"
        />
        <View className="mb-3 flex-row flex-wrap items-center justify-center gap-2">
          <Pill label={taskTypeLabel} tone="coral" size="sm" />
          <Pill label={completedLabel} tone="sage" size="sm" />
        </View>
        <Text className="mb-2 text-center text-2xl font-black text-gray-900">
          {title}
        </Text>
        {taskTitle ? (
          <Text className="mb-2 text-center text-lg font-extrabold text-gray-900">
            {taskTitle}
          </Text>
        ) : null}
        <Text className="mb-6 text-center text-[15px] font-semibold leading-5 text-gray-500">
          {message}
        </Text>

        <View className="w-full">
          <StackedButton
            label={closeLabel}
            onPress={onClose}
            variant="primary"
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}
