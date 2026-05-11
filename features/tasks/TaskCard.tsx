import { Ionicons } from '@expo/vector-icons';
import { Alert, Linking, Pressable, Text, View } from 'react-native';

import { StackedButton } from '../../components/StackedButton';
import { useLanguage } from '../../context/LanguageContext';
import { colors, shadows } from '../../theme/tokens';
import { useCompleteOdyssey, useDiscardOdyssey, useRedoOdyssey, useStartOdyssey } from './useTasks';

export interface OdysseyNode {
  id: string;
  slug?: string;
  title: Record<string, string>;
  description?: Record<string, string>;
  type: 'main' | 'side';
  deadline_hint?: Record<string, string>;
  can_parallel: boolean;
  source_url?: string | null;
  last_verified_at?: string | null;
}

export interface OdysseyState {
  odyssey_node_id: string;
  status: 'locked' | 'available' | 'in_progress' | 'done' | 'skipped' | 'discarded';
  notes?: string | null;
  discarded_at?: string | null;
  completed_at?: string | null;
}

interface Props {
  node: OdysseyNode;
  state: OdysseyState | undefined;
  onRefresh: () => void;
  onTaskComplete?: (task: { title: Record<string, string>; type: OdysseyNode['type'] }) => void;
  onPressDetail?: (node: OdysseyNode, state: OdysseyState | undefined) => void;
}

/**
 * Warm-palette status tones — replaces the old cold-blue locked + neutral
 * gray with peach / cream / sage / lavender. Each entry also carries a
 * gradient pair used as the card's soft glass surface.
 */
const STATUS_STYLES: Record<
  string,
  {
    background: string;
    eyebrow: string;
    chipBg: string;
    chipText: string;
    deadlineText: string;
    border: string;
  }
> = {
  available: {
    background: '#FFF8F1',
    eyebrow: colors.brandCoral,
    chipBg: '#FFE8DA',
    chipText: colors.brandCoral,
    deadlineText: '#B07A1E',
    border: 'rgba(232,221,210,0.68)',
  },
  in_progress: {
    background: '#FFF3E7',
    eyebrow: '#E08F4D',
    chipBg: '#FFF1D9',
    chipText: '#B07A1E',
    deadlineText: '#B07A1E',
    border: 'rgba(255,205,160,0.7)',
  },
  done: {
    background: '#F8FDF0',
    eyebrow: '#5C8A48',
    chipBg: 'rgba(143, 188, 122, 0.18)',
    chipText: '#5C8A48',
    deadlineText: '#5C8A48',
    border: 'rgba(143, 188, 122, 0.30)',
  },
  locked: {
    background: '#F7F0E8',
    eyebrow: colors.textSubtle,
    chipBg: '#F0E7DE',
    chipText: colors.textMuted,
    deadlineText: colors.textSubtle,
    border: 'rgba(218,205,190,0.72)',
  },
  skipped: {
    background: '#F7F0E8',
    eyebrow: colors.textSubtle,
    chipBg: '#F0E7DE',
    chipText: colors.textMuted,
    deadlineText: colors.textSubtle,
    border: 'rgba(218,205,190,0.72)',
  },
};

function getSourceHost(sourceUrl: string | null | undefined) {
  if (!sourceUrl) return null;
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return sourceUrl;
  }
}

function getVerificationDate(value: string | null | undefined, langCode: string) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat(langCode, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}

export function OdysseyCard({ node, state, onRefresh, onTaskComplete, onPressDetail }: Props) {
  const { t, langCode } = useLanguage();
  const start = useStartOdyssey();
  const complete = useCompleteOdyssey();
  const redo = useRedoOdyssey();
  const discard = useDiscardOdyssey();

  const title = node.title?.[langCode] ?? node.title?.en ?? node.title?.zh ?? '';
  const description = node.description?.[langCode] ?? node.description?.en ?? node.description?.zh ?? '';
  const deadlineHint = node.deadline_hint?.[langCode] ?? node.deadline_hint?.en ?? null;
  const status = state?.status ?? 'locked';
  const isMain = node.type === 'main';
  const sourceHost = getSourceHost(node.source_url);
  const verificationDate = getVerificationDate(node.last_verified_at, langCode);
  const tone = STATUS_STYLES[status] ?? STATUS_STYLES.locked;

  const canDiscard = status === 'locked' || status === 'available' || status === 'in_progress';

  const handleDiscard = () => {
    Alert.alert(
      t.tasks.discard_confirm_title,
      t.tasks.discard_confirm_body,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.tasks.discard_action,
          style: 'destructive',
          onPress: () => discard.mutate(node.id, { onSuccess: onRefresh }),
        },
      ],
    );
  };

  return (
    <View
      style={{
        borderRadius: 28,
        backgroundColor: tone.background,
        borderWidth: 1,
        borderColor: tone.border,
        ...shadows.card,
      }}
    >
      <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16 }}>
        <Pressable
          onPress={() => onPressDetail?.(node, state)}
          disabled={!onPressDetail}
          style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
        >
          {isMain && (
            <View
              style={{
                backgroundColor: tone.chipBg,
                borderRadius: 999,
                paddingHorizontal: 11,
                paddingVertical: 5,
              }}
            >
              <Text
                style={{
                  color: tone.chipText,
                  fontSize: 10.5,
                  fontWeight: '700',
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}
              >
                {t.tasks.type_main}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View
              style={{
                width: 26,
                height: 4,
                borderRadius: 999,
                backgroundColor: tone.eyebrow,
                marginBottom: 8,
              }}
            />
            <Text style={{ fontSize: 17, fontWeight: '800', lineHeight: 23, color: colors.textMain, letterSpacing: -0.1 }}>
              {title}
            </Text>
            {description ? (
              <Text
                style={{ marginTop: 6, fontSize: 13.5, lineHeight: 20, color: colors.textMuted }}
                numberOfLines={3}
              >
                {description}
              </Text>
            ) : null}
          </View>
          {onPressDetail ? (
            <Ionicons name="chevron-forward" size={18} color={tone.chipText} />
          ) : null}
        </Pressable>

        {(sourceHost || verificationDate) && (
          <View style={{ marginBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {sourceHost && node.source_url && (
              <Pressable
                style={{
                  backgroundColor: tone.chipBg,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
                onPress={() => {
                  void Linking.openURL(node.source_url!);
                }}
              >
                <Text style={{ color: tone.chipText, fontSize: 11.5, fontWeight: '700' }}>
                  {sourceHost}
                </Text>
              </Pressable>
            )}
            {verificationDate && (
              <View
                style={{
                  backgroundColor: tone.chipBg,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: tone.chipText, fontSize: 11.5, fontWeight: '500' }}>
                  {verificationDate}
                </Text>
              </View>
            )}
          </View>
        )}

        {deadlineHint && (
          <View style={{ marginBottom: 14 }}>
            <Text style={{ color: tone.deadlineText, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.3 }}>
              {deadlineHint}
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {status === 'available' && (
              <StackedButton
                label={t.tasks.start}
                onPress={() => start.mutate(node.id, { onSuccess: onRefresh })}
                loading={start.isPending}
                variant="primary"
                size="xs"
              />
            )}

            {status === 'in_progress' && (
              <StackedButton
                label={t.tasks.complete}
                onPress={() =>
                  complete.mutate(node.id, {
                    onSuccess: () => {
                      onRefresh();
                      if (onTaskComplete) onTaskComplete({ title: node.title, type: node.type });
                    },
                  })
                }
                loading={complete.isPending}
                variant="success"
                size="xs"
              />
            )}

            {status === 'done' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    backgroundColor: 'rgba(143, 188, 122, 0.18)',
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                  }}
                >
                  <Text style={{ color: '#5C8A48', fontSize: 12, fontWeight: '800', letterSpacing: 0.4 }}>
                    {t.tasks.done}
                  </Text>
                </View>
                <StackedButton
                  label={t.tasks.redo}
                  onPress={() => redo.mutate(node.id, { onSuccess: onRefresh })}
                  loading={redo.isPending}
                  variant="neutral"
                  size="xs"
                />
              </View>
            )}

            {status === 'skipped' && (
              <StackedButton
                label={t.tasks.redo}
                onPress={() => redo.mutate(node.id, { onSuccess: onRefresh })}
                loading={redo.isPending}
                variant="neutral"
                size="xs"
              />
            )}
          </View>

          {canDiscard ? (
            <Pressable
              onPress={handleDiscard}
              disabled={discard.isPending}
              hitSlop={6}
              style={{ paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.textSubtle, letterSpacing: 0.2 }}>
                {discard.isPending ? '...' : t.tasks.not_for_me}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
