import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground } from '../../components/AppBackground';
import { GlassCard } from '../../components/GlassCard';
import { Pill } from '../../components/Pill';
import { StackedButton } from '../../components/StackedButton';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { colors, shadows } from '../../theme/tokens';
import { OdysseyNode, OdysseyState } from './TaskCard';
import {
  useCompleteOdyssey,
  useRedoOdyssey,
  useSetOdysseyNote,
  useStartOdyssey,
} from './useTasks';

const HIGH_RISK_SLUG_PATTERNS = [
  'anmeldung',
  'visa',
  'residence',
  'aufenthalt',
  'tax',
  'steuer',
  'insurance',
  'versicher',
  'work_permit',
  'work-permit',
  'arbeitserlaubnis',
];

function isHighRiskSlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  const lower = slug.toLowerCase();
  return HIGH_RISK_SLUG_PATTERNS.some((p) => lower.includes(p));
}

function getSourceHost(sourceUrl: string | null | undefined) {
  if (!sourceUrl) return null;
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return sourceUrl;
  }
}

function formatVerificationDate(value: string | null | undefined, langCode: string) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat(langCode, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  available: { bg: '#FFE8DA', fg: '#F28B6D' },
  in_progress: { bg: '#FFF1D9', fg: '#B07A1E' },
  done: { bg: 'rgba(143, 188, 122, 0.18)', fg: '#5C8A48' },
  locked: { bg: 'rgba(98,57,40,0.06)', fg: '#A89A92' },
  skipped: { bg: 'rgba(98,57,40,0.06)', fg: '#A89A92' },
};

interface Props {
  visible: boolean;
  node: OdysseyNode | null;
  state: OdysseyState | undefined;
  onClose: () => void;
  onTaskComplete?: (task: { title: Record<string, string>; type: OdysseyNode['type'] }) => void;
}

export function OdysseyDetailModal({ visible, node, state, onClose, onTaskComplete }: Props) {
  const { t, langCode } = useLanguage();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const start = useStartOdyssey();
  const complete = useCompleteOdyssey();
  const redo = useRedoOdyssey();
  const setNote = useSetOdysseyNote();

  const [noteDraft, setNoteDraft] = useState(state?.notes ?? '');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (visible) {
      setNoteDraft(state?.notes ?? '');
      setSavedFlash(false);
    }
  }, [visible, state?.notes, node?.id]);

  const status = state?.status ?? 'locked';
  const tone = STATUS_TONE[status] ?? STATUS_TONE.locked;
  const slug = (node as { slug?: string | null } | null)?.slug ?? null;
  const highRisk = isHighRiskSlug(slug);

  const title = useMemo(
    () => (node ? node.title?.[langCode] ?? node.title?.en ?? node.title?.zh ?? '' : ''),
    [node, langCode],
  );
  const description = useMemo(
    () => (node ? node.description?.[langCode] ?? node.description?.en ?? node.description?.zh ?? '' : ''),
    [node, langCode],
  );
  const deadlineHint = useMemo(
    () => (node ? node.deadline_hint?.[langCode] ?? node.deadline_hint?.en ?? null : null),
    [node, langCode],
  );

  const sourceHost = getSourceHost(node?.source_url);
  const verifiedDate = formatVerificationDate(node?.last_verified_at, langCode);

  const noteIsDirty = noteDraft.trim() !== (state?.notes ?? '').trim();

  const handleSaveNote = () => {
    if (!node) return;
    setNote.mutate(
      { odysseyId: node.id, notes: noteDraft },
      {
        onSuccess: () => {
          setSavedFlash(true);
          setTimeout(() => setSavedFlash(false), 1500);
        },
      },
    );
  };

  const handleStatusAction = () => {
    if (!node) return;
    if (status === 'available') {
      start.mutate(node.id);
    } else if (status === 'in_progress') {
      complete.mutate(node.id, {
        onSuccess: () => {
          onTaskComplete?.({ title: node.title, type: node.type });
          onClose();
        },
      });
    } else if (status === 'done' || status === 'skipped') {
      redo.mutate(node.id);
    }
  };

  const statusActionLabel =
    status === 'available'
      ? t.tasks.start
      : status === 'in_progress'
      ? t.tasks.complete
      : status === 'done' || status === 'skipped'
      ? t.tasks.redo
      : null;

  const statusActionLoading = start.isPending || complete.isPending || redo.isPending;

  const userContextItems = useMemo(() => {
    if (!user) return [] as { label: string; value: string }[];
    const items: { label: string; value: string }[] = [];
    if (user.city) {
      items.push({ label: t.profile.base_in_label, value: user.city });
    }
    if (user.identity) {
      const label = t.auth[`identity_${user.identity}` as keyof typeof t.auth] as string | undefined;
      if (label) items.push({ label: t.auth.identity_label, value: label });
    }
    if (user.arrival_stage) {
      const label = t.onboarding[`stage_${user.arrival_stage}` as keyof typeof t.onboarding] as
        | string
        | undefined;
      if (label) items.push({ label: t.onboarding.stage_prompt, value: label });
    }
    if (user.intent_tags && user.intent_tags.length > 0) {
      const labels = user.intent_tags
        .map((intent) => t.onboarding[`intent_${intent}` as keyof typeof t.onboarding] as string | undefined)
        .filter((label): label is string => Boolean(label));
      if (labels.length > 0) {
        items.push({ label: t.onboarding.intent_prompt, value: labels.join(' · ') });
      }
    }
    return items;
  }, [user, t.auth, t.onboarding, t.profile.base_in_label]);

  if (!node) return null;

  const isMain = node.type === 'main';
  const typeLabel = isMain ? t.tasks.type_main : t.tasks.type_side;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <AppBackground>
        {/* IOS-LOGIN-111: iOS Modal context doesn't propagate safe-area insets
            to SafeAreaView reliably; use outer insets directly. */}
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 18,
              paddingVertical: 12,
            }}
          >
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [
                {
                  height: 42,
                  width: 42,
                  borderRadius: 21,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: 'rgba(232, 221, 210, 0.8)',
                  ...shadows.iconButton,
                },
                pressed ? { transform: [{ scale: 0.94 }] } : null,
              ]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.textMain} />
            </Pressable>
            <Pill label={typeLabel} tone={isMain ? 'peach' : 'coral'} size="sm" />
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 50 }}>
              {/* Title */}
              <View style={{ paddingTop: 8, paddingBottom: 18 }}>
                <Text style={{ fontSize: 26, fontWeight: '800', lineHeight: 33, color: colors.textMain, letterSpacing: -0.4 }}>
                  {title}
                </Text>
                {deadlineHint ? (
                  <View
                    style={{
                      marginTop: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      alignSelf: 'flex-start',
                      borderRadius: 999,
                      backgroundColor: '#FFF1D9',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Ionicons name="time-outline" size={14} color="#B07A1E" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#B07A1E' }}>{deadlineHint}</Text>
                  </View>
                ) : null}
              </View>

              {/* Status card */}
              <GlassCard tone="white" radiusKey="3xl" padding={18} style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 1.1,
                    textTransform: 'uppercase',
                    color: colors.textMuted,
                  }}
                >
                  {t.tasks.detail_section_status}
                </Text>
                <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: tone.bg,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: tone.fg, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                      {t.tasks[status as keyof typeof t.tasks] ?? status}
                    </Text>
                  </View>
                  {statusActionLabel ? (
                    <StackedButton
                      label={statusActionLabel}
                      onPress={handleStatusAction}
                      loading={statusActionLoading}
                      variant={status === 'in_progress' ? 'success' : status === 'done' ? 'neutral' : 'primary'}
                    />
                  ) : null}
                </View>
              </GlassCard>

              {/* Stable guide */}
              <GlassCard tone="white" radiusKey="3xl" padding={18} style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 1.1,
                    textTransform: 'uppercase',
                    color: colors.textMuted,
                  }}
                >
                  {t.tasks.detail_section_guide}
                </Text>
                <Text style={{ marginTop: 12, fontSize: 15, lineHeight: 23, color: colors.textMain }}>
                  {description || t.tasks.detail_no_description}
                </Text>
              </GlassCard>

              {/* User context */}
              {userContextItems.length > 0 ? (
                <GlassCard tone="cream" radiusKey="3xl" padding={18} style={{ marginBottom: 12 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      letterSpacing: 1.1,
                      textTransform: 'uppercase',
                      color: colors.textMuted,
                    }}
                  >
                    {t.tasks.detail_section_user_context}
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSubtle }}>
                    {t.tasks.detail_section_user_context_hint}
                  </Text>
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {userContextItems.map((item) => (
                      <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: colors.textMuted }}>{item.label}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMain }}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                </GlassCard>
              ) : null}

              {/* Official sources */}
              <GlassCard tone="white" radiusKey="3xl" padding={18} style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 1.1,
                    textTransform: 'uppercase',
                    color: colors.textMuted,
                  }}
                >
                  {t.tasks.detail_section_official_sources}
                </Text>
                {sourceHost && node.source_url ? (
                  <View style={{ marginTop: 12 }}>
                    <Pressable
                      onPress={() => void Linking.openURL(node.source_url!)}
                      style={({ pressed }) => [
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: 'rgba(232, 221, 210, 0.72)',
                          backgroundColor: '#FFF8F1',
                          paddingHorizontal: 14,
                          paddingVertical: 14,
                        },
                        pressed ? { transform: [{ scale: 0.99 }] } : null,
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="globe-outline" size={16} color={colors.brandCoral} />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMain }} numberOfLines={1}>
                          {sourceHost}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brandCoral }}>
                        {t.tasks.detail_open_source}
                      </Text>
                    </Pressable>
                    {verifiedDate ? (
                      <Text style={{ marginTop: 8, fontSize: 11.5, color: colors.textSubtle }}>
                        {t.tasks.detail_last_verified} · {verifiedDate}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={{ marginTop: 12, fontSize: 14, lineHeight: 20, color: colors.textMuted }}>
                    {t.tasks.detail_no_sources}
                  </Text>
                )}
              </GlassCard>

              {/* Risk disclaimer */}
              <View
                style={{
                  marginTop: 0,
                  marginBottom: 12,
                  borderRadius: 24,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: highRisk ? 'rgba(244, 124, 124, 0.10)' : '#FFF1D9',
                  borderWidth: 1,
                  borderColor: highRisk ? 'rgba(244, 124, 124, 0.24)' : 'rgba(255, 200, 122, 0.30)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Ionicons
                    name={highRisk ? 'shield-outline' : 'information-circle-outline'}
                    size={18}
                    color={highRisk ? colors.danger : '#B07A1E'}
                  />
                  <Text
                    style={{ flex: 1, fontSize: 13, lineHeight: 19, color: highRisk ? colors.danger : '#8A5A00' }}
                  >
                    {highRisk ? t.tasks.detail_risk_high : t.tasks.detail_risk_generic}
                  </Text>
                </View>
              </View>

              {/* Notes */}
              <GlassCard tone="white" radiusKey="3xl" padding={18}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      letterSpacing: 1.1,
                      textTransform: 'uppercase',
                      color: colors.textMuted,
                    }}
                  >
                    {t.tasks.detail_section_notes}
                  </Text>
                  {savedFlash ? (
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#5C8A48' }}>
                      {t.tasks.detail_notes_saved}
                    </Text>
                  ) : null}
                </View>
                <TextInput
                  value={noteDraft}
                  onChangeText={setNoteDraft}
                  placeholder={t.tasks.detail_notes_placeholder}
                  placeholderTextColor={colors.textSubtle}
                  multiline
                  style={{
                    minHeight: 100,
                    textAlignVertical: 'top',
                    marginTop: 12,
                    borderRadius: 18,
                    backgroundColor: '#FFF8F1',
                    borderWidth: 1,
                    borderColor: 'rgba(232, 221, 210, 0.72)',
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 14,
                    lineHeight: 20,
                    color: colors.textMain,
                  }}
                />
                <Pressable
                  onPress={handleSaveNote}
                  disabled={!noteIsDirty || setNote.isPending}
                  style={({ pressed }) => [
                    {
                      marginTop: 12,
                      alignSelf: 'flex-end',
                      paddingHorizontal: 18,
                      paddingVertical: 9,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: !noteIsDirty || setNote.isPending ? colors.lineSofter : 'rgba(255,200,175,0.65)',
                      backgroundColor: !noteIsDirty || setNote.isPending ? '#E5E0D7' : colors.brandCoral,
                      opacity: !noteIsDirty || setNote.isPending ? 0.55 : 1,
                      ...(!noteIsDirty || setNote.isPending ? {} : shadows.cta),
                    },
                    pressed ? { transform: [{ scale: 0.97 }] } : null,
                  ]}
                >
                  {setNote.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 }}>
                      {t.tasks.detail_notes_save}
                    </Text>
                  )}
                </Pressable>
              </GlassCard>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </AppBackground>
    </Modal>
  );
}
