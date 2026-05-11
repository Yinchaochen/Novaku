import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../components/AppBackground';
import { GlassCard } from '../components/GlassCard';
import { Pill } from '../components/Pill';
import { Toast, type ToastMessage } from '../components/Toast';
import { useLanguage } from '../context/LanguageContext';
import { colors, gradients, shadows } from '../theme/tokens';
import {
  OdysseyHistoryItem,
  useOdysseyHistory,
  useRedoOdyssey,
  useRestoreOdyssey,
  useRestorePersonalOdyssey,
} from '../features/tasks/useTasks';

type HistoryTab = 'completed' | 'discarded';

function formatDate(value: string | null, langCode: string): string {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat(langCode, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}

function HistoryRow({
  item,
  langCode,
  onRestore,
  restoringId,
}: {
  item: OdysseyHistoryItem;
  langCode: string;
  onRestore: (item: OdysseyHistoryItem) => void;
  restoringId: string | null;
}) {
  const { t } = useLanguage();
  const title =
    item.node.title?.[langCode] ??
    item.node.title?.en ??
    item.node.title?.zh ??
    item.node.slug;
  const description =
    item.node.description?.[langCode] ??
    item.node.description?.en ??
    item.node.description?.zh ??
    null;
  const dateValue =
    item.state.status === 'done' ? item.state.completed_at : item.state.discarded_at;
  const dateLabel = formatDate(dateValue, langCode);
  const isMain = item.node.type === 'main';

  return (
    <GlassCard tone="white" radiusKey="2xl" padding={16} style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <View style={{ marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pill label={isMain ? t.tasks.type_main : t.tasks.type_side} tone={isMain ? 'coral' : 'cream'} size="xs" />
            {dateLabel ? (
              <Text style={{ fontSize: 11, color: colors.textSubtle }}>{dateLabel}</Text>
            ) : null}
          </View>
          <Text
            style={{ fontSize: 15, fontWeight: '700', color: colors.textMain, letterSpacing: -0.1 }}
            numberOfLines={2}
          >
            {title}
          </Text>
          {description ? (
            <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.textMuted }} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => onRestore(item)}
          disabled={restoringId === item.node.id}
          style={({ pressed }) => [
            {
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: '#FFE8DA',
              borderWidth: 1,
              borderColor: 'rgba(246,118,115,0.18)',
            },
            pressed ? { transform: [{ scale: 0.96 }] } : null,
          ]}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brandCoral }}>
            {restoringId === item.node.id ? '...' : t.tasks.restore_action}
          </Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

export default function OdysseyHistoryScreen() {
  const { t, langCode } = useLanguage();
  const [tab, setTab] = useState<HistoryTab>('completed');
  const history = useOdysseyHistory();
  const restoreDiscarded = useRestoreOdyssey();
  const redoCompleted = useRedoOdyssey();
  const restorePersonal = useRestorePersonalOdyssey();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const onRestoreError = (err: unknown) => {
    const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
    if (code === 'odyssey.already_active') {
      setToast({ id: Date.now(), tone: 'info', text: t.tasks.restore_blocked_active, durationMs: 2200 });
    }
  };

  const handleRestore = (item: OdysseyHistoryItem) => {
    setRestoringId(item.node.id);
    const onSettled = () => setRestoringId(null);
    if (item.node.kind === 'personal') {
      restorePersonal.mutate(item.node.id, { onError: onRestoreError, onSettled });
    } else if (item.state.status === 'done') {
      redoCompleted.mutate(item.node.id, { onError: onRestoreError, onSettled });
    } else {
      restoreDiscarded.mutate(item.node.id, { onError: onRestoreError, onSettled });
    }
  };

  const completed = history.data?.completed ?? [];
  const discarded = history.data?.discarded ?? [];
  const list = tab === 'completed' ? completed : discarded;

  const tabKeys: HistoryTab[] = ['completed', 'discarded'];
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const slotWidth = tabBarWidth > 0 ? tabBarWidth / tabKeys.length : 0;
  const indicatorX = useRef(new Animated.Value(0)).current;
  const activeIndex = tabKeys.indexOf(tab);
  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (slotWidth === 0) return;
    Animated.spring(indicatorX, {
      toValue: activeIndex * slotWidth,
      useNativeDriver: true,
      friction: 9,
      tension: 90,
    }).start();
  }, [activeIndex, slotWidth, indicatorX]);

  useEffect(() => {
    contentOpacity.setValue(0.4);
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [tab, contentOpacity]);

  return (
    <AppBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 10 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [
              {
                height: 42,
                width: 42,
                borderRadius: 21,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.86)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.85)',
                ...shadows.iconButton,
              },
              pressed ? { transform: [{ scale: 0.94 }] } : null,
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textMain} />
          </Pressable>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textMain, letterSpacing: -0.3 }}>
            {t.tasks.history_title}
          </Text>
        </View>

        <View
          onLayout={(e) => setTabBarWidth(e.nativeEvent.layout.width - 8)}
          style={{
            marginHorizontal: 18,
            marginBottom: 14,
            flexDirection: 'row',
            borderRadius: 999,
            padding: 4,
            backgroundColor: 'rgba(255,255,255,0.86)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.85)',
            ...shadows.iconButton,
          }}
        >
          {slotWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 4,
                bottom: 4,
                left: 4,
                width: slotWidth,
                borderRadius: 999,
                overflow: 'hidden',
                transform: [{ translateX: indicatorX }],
              }}
            >
              <LinearGradient
                colors={gradients.brandCta as unknown as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          ) : null}
          {(
            [
              { key: 'completed', label: t.tasks.history_completed_tab, count: completed.length },
              { key: 'discarded', label: t.tasks.history_discarded_tab, count: discarded.length },
            ] as { key: HistoryTab; label: string; count: number }[]
          ).map((opt) => {
            const active = tab === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setTab(opt.key)}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999 }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    letterSpacing: 0.2,
                    color: active ? '#FFFFFF' : colors.textMuted,
                  }}
                >
                  {opt.label} · {opt.count}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
          {history.isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={colors.brandCoral} />
            </View>
          ) : list.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 28, opacity: 0.4, marginBottom: 12 }}>✦</Text>
              <Text style={{ textAlign: 'center', fontSize: 14, color: colors.textMuted }}>
                {tab === 'completed' ? t.tasks.history_empty_completed : t.tasks.history_empty_discarded}
              </Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1, paddingHorizontal: 18 }} contentContainerStyle={{ paddingBottom: 60 }}>
              {list.map((item) => (
                <HistoryRow
                  key={item.state.odyssey_node_id}
                  item={item}
                  langCode={langCode}
                  onRestore={handleRestore}
                  restoringId={restoringId}
                />
              ))}
            </ScrollView>
          )}
        </Animated.View>
      </SafeAreaView>
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </AppBackground>
  );
}
