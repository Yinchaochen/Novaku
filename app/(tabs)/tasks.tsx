import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, BackHandler, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassCard } from '../../components/GlassCard';
import { LangPill } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import {
  ODYSSEY_TASK_LINE_TONES,
  OdysseyTaskLineCard,
  type OdysseyTaskLineTone,
} from '../../components/recipes/OdysseyTaskLineCard';
import { SectionLabel } from '../../components/SectionLabel';
import { Screen } from '../../components/Screen';
import { StackedButton } from '../../components/StackedButton';
import { useLanguage } from '../../context/LanguageContext';
import { useMe } from '../../features/auth/useAuth';
import * as secureStore from '../../lib/secureStore';
import { useAuthStore } from '../../store/authStore';
import { PersonalOdysseyCard } from '../../features/community/PersonalTaskCard';
import { usePersonalOdysseys } from '../../features/community/useCommunity';
import type { PersonalOdyssey } from '../../features/community/useCommunity';
import { OdysseyCard, OdysseyNode, OdysseyState } from '../../features/tasks/TaskCard';
import { OdysseyDetailModal } from '../../features/tasks/OdysseyDetailModal';
import { useDag } from '../../features/tasks/useTasks';
import { useLaneQuota, useRenameTaskLane, useTaskLanes } from '../../features/laneCreator/useLaneCreator';
import type { TaskLane } from '../../features/laneCreator/useLaneCreator';
import { getTabBarHeight } from '../../theme/layout';
import { colors } from '../../theme/tokens';

interface CelebrationState {
  visible: boolean;
  title: Record<string, string>;
  type: OdysseyNode['type'];
}

interface TaskLineSummary {
  id: string;
  kind: 'system' | 'ai' | 'side';
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: OdysseyTaskLineTone;
  nodes: OdysseyNode[];
  lane?: TaskLane;
}

const HISTORY_PILL_HEIGHT = 64;
const SYSTEM_LANE_ID = 'system-settle-germany';

export default function TasksScreen() {
  const { t, langCode } = useLanguage();
  const insets = useSafeAreaInsets();
  const tabBarHeight = getTabBarHeight(insets.bottom);
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
  const user = useAuthStore((s) => s.user);
  const me = useMe();
  const laneQuota = useLaneQuota();
  const taskLanes = useTaskLanes('active');
  const renameTaskLane = useRenameTaskLane();
  const laneRemaining = laneQuota.data ? Math.max(0, laneQuota.data.limit - laneQuota.data.used) : null;
  const [settledBannerVisible, setSettledBannerVisible] = useState(false);
  const [systemLaneTitle, setSystemLaneTitle] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<TaskLineSummary | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

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

  useEffect(() => {
    if (!user) {
      setSystemLaneTitle(null);
      return;
    }
    secureStore.getItemAsync(`system_lane_title_${user.id}`).then((title) => {
      setSystemLaneTitle(title || null);
    });
  }, [user?.id]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (renameTarget) {
        setRenameTarget(null);
        return true;
      }
      if (detailTarget) {
        setDetailTarget(null);
        return true;
      }
      if (celebration?.visible) {
        setCelebration(null);
        return true;
      }
      if (selectedLineId) {
        setSelectedLineId(null);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [celebration?.visible, detailTarget, renameTarget, selectedLineId]);

  const dismissSettledBanner = async () => {
    if (!user) return;
    await secureStore.setItemAsync(`settled_banner_dismissed_${user.id}`, '1');
    setSettledBannerVisible(false);
  };

  if (dag.isLoading && !dag.data && personal.isLoading && !personal.data) {
    return (
      <Screen background="default" contentStyle={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.brandCoral} />
      </Screen>
    );
  }

  if (dag.isError && !dag.data && personal.isError && !personal.data) {
    return (
      <Screen background="default" contentStyle={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.danger, fontSize: 14 }}>{t.common.error}</Text>
      </Screen>
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

  const visiblePersonalCount = personalTasks.filter((task) => task.status !== 'done').length;
  const hasSideContent = sideNodes.length > 0 || visiblePersonalCount > 0;
  const systemNodes = mainNodes.filter((node) => !node.lane_id);
  const laneNodes = mainNodes.filter((node) => Boolean(node.lane_id));
  const activeLanes = taskLanes.data ?? [];
  const taskLines: TaskLineSummary[] = [
    ...(systemNodes.length > 0
      ? [
          {
            id: SYSTEM_LANE_ID,
            kind: 'system' as const,
            title: systemLaneTitle ?? t.tasks.system_lane_title,
            subtitle: t.tasks.system_lane_subtitle,
            icon: 'home-outline' as const,
            tone: 'gold' as const,
            nodes: systemNodes,
          },
        ]
      : []),
    ...activeLanes.map((lane) => ({
      id: lane.id,
      kind: 'ai' as const,
      title: lane.title,
      subtitle: lane.description || t.tasks.ai_lane_subtitle,
      icon: lane.lane_type === 'trip' ? ('map-outline' as const) : ('sparkles-outline' as const),
      tone: lane.lane_type === 'trip' ? ('coral' as const) : ('lavender' as const),
      nodes: laneNodes.filter((node) => node.lane_id === lane.id),
      lane,
    })),
    ...(hasSideContent
      ? [
          {
            id: 'side-local',
            kind: 'side' as const,
            title: t.tasks.side_lane_title,
            subtitle: t.tasks.side_lane_subtitle,
            icon: 'leaf-outline' as const,
            tone: 'sage' as const,
            nodes: sideNodes,
          },
        ]
      : []),
  ];
  const selectedLine = selectedLineId ? taskLines.find((line) => line.id === selectedLineId) ?? null : null;

  const showError = dag.isError || personal.isError;
  const refreshAll = () => {
    void dag.refetch();
    void personal.refetch();
    void me.refetch();
    void taskLanes.refetch();
  };

  const openRenameSheet = (line: TaskLineSummary) => {
    if (line.kind === 'side') return;
    Alert.alert(line.title, undefined, [
      {
        text: t.tasks.task_line_change_name,
        onPress: () => {
          setRenameTarget(line);
          setRenameTitle(line.title);
        },
      },
      { text: t.common.cancel, style: 'cancel' },
    ]);
  };

  const saveRename = () => {
    const title = renameTitle.trim();
    if (!renameTarget || !title) return;

    if (renameTarget.kind === 'system') {
      if (user) {
        void secureStore.setItemAsync(`system_lane_title_${user.id}`, title);
      }
      setSystemLaneTitle(title);
      setRenameTarget(null);
      setRenameTitle('');
      return;
    }

    if (renameTarget.lane) {
      renameTaskLane.mutate(
        { laneId: renameTarget.lane.id, title },
        {
          onSuccess: () => {
            setRenameTarget(null);
            setRenameTitle('');
          },
          onError: () => Alert.alert(t.common.error),
        },
      );
    }
  };

  return (
    <Screen background="default" contentStyle={{ paddingBottom: 0 }} testID="screen.tasks">
      {/* Yellow band hero — matches the YumQuick-style consistent header
          shipped on auth pages and the Buddy tab. White title + LangPill on
          right; the cream background takes over below the curved 32px corner. */}
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
          collapsable={false}
          nestedScrollEnabled
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: tabBarHeight + 28,
          }}
          refreshControl={
            <RefreshControl
              refreshing={(dag.isFetching && !dag.isLoading) || (personal.isFetching && !personal.isLoading)}
              onRefresh={refreshAll}
              tintColor={colors.brandCoral}
            />
          }
        >
          {!selectedLine ? (
            <>
              <View style={styles.ctaCardShell}>
                <Pressable
                  onPress={() => router.push('/lane-creator' as never)}
                  accessibilityRole="button"
                  style={styles.ctaPressable}
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
                          backgroundColor: '#EDE7FF',
                        }}
                      >
                        <Ionicons name="sparkles-outline" size={22} color="#6269D9" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textMain, marginBottom: 2 }}>
                          {t.laneCreator.entry_title}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }} numberOfLines={2}>
                          {t.laneCreator.entry_body}
                        </Text>
                        {laneRemaining !== null ? (
                          <Text style={{ fontSize: 11, color: '#6269D9', fontWeight: '700', marginTop: 3 }}>
                            {laneRemaining > 0
                              ? t.laneCreator.quota_left.replace('{count}', String(laneRemaining))
                              : t.laneCreator.quota_none}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
                    </View>
                  </GlassCard>
                </Pressable>
              </View>
            </>
          ) : null}

          {selectedLine ? (
            <TaskLineDetail
              line={selectedLine}
              stateMap={stateMap}
              personalTasks={selectedLine.kind === 'side' ? personalTasks.filter((task) => task.status !== 'done') : []}
              onBack={() => setSelectedLineId(null)}
              onOpenMenu={() => openRenameSheet(selectedLine)}
              onRefresh={refreshAll}
              onPressTask={(node, state) => setDetailTarget({ node, state })}
              onTaskComplete={(task) => {
                setCelebration({ visible: true, title: task.title, type: task.type });
              }}
            />
          ) : (
            <>
              <View style={{ marginTop: 18, marginBottom: 12 }}>
                <SectionLabel tone="muted">{t.tasks.task_line_section}</SectionLabel>
              </View>
              {taskLines.map((line) => (
                <OdysseyTaskLineCard
                  key={line.id}
                  title={line.title}
                  subtitle={line.subtitle}
                  icon={line.icon}
                  tone={line.tone}
                  activeCount={
                    line.kind === 'side'
                      ? line.nodes.length + visiblePersonalCount
                      : line.nodes.length
                  }
                  countLabel={t.tasks.task_line_task_count}
                  onPress={() => setSelectedLineId(line.id)}
                />
              ))}

              <View style={styles.historyPill}>
                <Pressable
                  onPress={() => router.push('/odyssey-history' as never)}
                  accessibilityRole="button"
                  accessibilityLabel={t.tasks.history}
                  style={styles.historyPillPressable}
                >
                  <View pointerEvents="none" style={styles.historyPillContent}>
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
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
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

      <Modal
        visible={renameTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameTarget(null)}
      >
        <View style={styles.modalScrim}>
          <View style={styles.renameModal}>
            <Text style={styles.renameTitle}>{t.tasks.task_line_rename_title}</Text>
            <TextInput
              value={renameTitle}
              onChangeText={setRenameTitle}
              placeholder={t.tasks.task_line_name_placeholder}
              placeholderTextColor={colors.textSubtle}
              autoFocus
              style={styles.renameInput}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setRenameTarget(null)}
                style={[styles.renameButton, { backgroundColor: '#F6EEE5' }]}
              >
                <Text style={[styles.renameButtonText, { color: colors.textMuted }]}>{t.common.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={saveRename}
                disabled={!renameTitle.trim() || renameTaskLane.isPending}
                style={[
                  styles.renameButton,
                  {
                    backgroundColor: !renameTitle.trim() || renameTaskLane.isPending
                      ? '#EADFD4'
                      : colors.brandCoral,
                  },
                ]}
              >
                <Text style={[styles.renameButtonText, { color: '#FFFFFF' }]}>
                  {t.tasks.task_line_rename_save}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function TaskLineDetail({
  line,
  stateMap,
  personalTasks,
  onBack,
  onOpenMenu,
  onRefresh,
  onPressTask,
  onTaskComplete,
}: {
  line: TaskLineSummary;
  stateMap: Record<string, OdysseyState | undefined>;
  personalTasks: PersonalOdyssey[];
  onBack: () => void;
  onOpenMenu: () => void;
  onRefresh: () => void;
  onPressTask: (node: OdysseyNode, state: OdysseyState | undefined) => void;
  onTaskComplete: (task: { title: Record<string, string>; type: OdysseyNode['type'] }) => void;
}) {
  const { t } = useLanguage();
  const tone = ODYSSEY_TASK_LINE_TONES[line.tone];
  const sections = [
    { title: t.tasks.section_progress, data: line.nodes.filter((node) => stateMap[node.id]?.status === 'in_progress') },
    { title: t.tasks.section_available, data: line.nodes.filter((node) => stateMap[node.id]?.status === 'available') },
    {
      title: t.tasks.section_locked,
      data: line.nodes.filter((node) => !stateMap[node.id] || stateMap[node.id]?.status === 'locked'),
    },
  ].filter((section) => section.data.length > 0);
  const hasTasks = sections.length > 0 || personalTasks.length > 0;

  return (
    <View>
      <View style={styles.lineDetailHeader}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.detailBackButton}>
          <Ionicons name="chevron-back" size={22} color={colors.textMain} />
        </Pressable>
        <View style={[styles.lineIcon, { backgroundColor: tone.iconBg }]}>
          <Ionicons name={line.icon} size={23} color={tone.icon} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.detailTitle} numberOfLines={2}>
            {line.title}
          </Text>
          <Text style={styles.detailSubtitle} numberOfLines={2}>
            {line.subtitle}
          </Text>
        </View>
        {line.kind !== 'side' ? (
          <Pressable onPress={onOpenMenu} hitSlop={10} style={styles.detailMenuButton}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMain} />
          </Pressable>
        ) : null}
      </View>

      {!hasTasks ? (
        <View style={styles.lineEmptyState}>
          <Text style={styles.lineEmptyText}>{t.tasks.task_line_empty}</Text>
        </View>
      ) : null}

      {sections.map((section) => (
        <View key={section.title}>
          <View style={{ marginTop: 18, marginBottom: 12 }}>
            <SectionLabel tone="muted">{section.title}</SectionLabel>
          </View>
          {section.data.map((node) => (
            <View key={node.id} style={{ marginBottom: 12 }}>
              <OdysseyCard
                node={node}
                state={stateMap[node.id]}
                onRefresh={onRefresh}
                onTaskComplete={onTaskComplete}
                onPressDetail={onPressTask}
              />
            </View>
          ))}
        </View>
      ))}

      {personalTasks.length > 0 ? (
        <View>
          <View style={{ marginTop: 18, marginBottom: 12 }}>
            <SectionLabel tone="coral">{t.tasks.section_from_plaza}</SectionLabel>
          </View>
          {personalTasks.map((task) => (
            <View key={task.id} style={{ marginBottom: 12 }}>
              <PersonalOdysseyCard task={task} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
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

const styles = StyleSheet.create({
  ctaCardShell: {
    marginBottom: 14,
  },
  ctaPressable: {
    borderRadius: 28,
  },
  lineIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  historyPill: {
    height: HISTORY_PILL_HEIGHT,
    marginHorizontal: 24,
    marginTop: 18,
    marginBottom: 10,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(98, 57, 40, 0.13)',
    shadowColor: '#7A4A2C',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  historyPillPressable: {
    flex: 1,
    borderRadius: 32,
  },
  historyPillContent: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
    marginBottom: 6,
  },
  detailBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(98, 57, 40, 0.10)',
  },
  detailMenuButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(98, 57, 40, 0.10)',
  },
  detailTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    color: colors.textMain,
  },
  detailSubtitle: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textMuted,
  },
  lineEmptyState: {
    marginTop: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(98, 57, 40, 0.10)',
    padding: 18,
  },
  lineEmptyText: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textMuted,
    fontWeight: '600',
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(44, 34, 27, 0.42)',
    justifyContent: 'center',
    padding: 24,
  },
  renameModal: {
    borderRadius: 28,
    backgroundColor: '#FFF9F2',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(98, 57, 40, 0.12)',
  },
  renameTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
    color: colors.textMain,
    marginBottom: 14,
  },
  renameInput: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(98, 57, 40, 0.14)',
    paddingHorizontal: 14,
    color: colors.textMain,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  renameButton: {
    flex: 1,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
