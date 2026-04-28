import { Linking, Pressable, Text, View } from 'react-native';

import { StackedButton } from '../../components/StackedButton';
import { useLanguage } from '../../context/LanguageContext';
import { useCompleteTask, useStartTask } from './useTasks';

export interface TaskNode {
  id: string;
  title: Record<string, string>;
  description?: Record<string, string>;
  type: 'main' | 'side';
  deadline_hint?: Record<string, string>;
  can_parallel: boolean;
  source_url?: string | null;
  last_verified_at?: string | null;
}

export interface TaskState {
  task_node_id: string;
  status: 'locked' | 'available' | 'in_progress' | 'done' | 'skipped';
  note?: string | null;
}

interface Props {
  node: TaskNode;
  state: TaskState | undefined;
  onRefresh: () => void;
}

const STATUS_STYLES: Record<string, {
  shell: string;
  surface: string;
  eyebrow: string;
  chipBg: string;
  chipText: string;
  deadlineText: string;
}> = {
  available: {
    shell: '#D7DDF8',
    surface: '#FFFFFF',
    eyebrow: '#5B67CA',
    chipBg: '#EEF1FF',
    chipText: '#4A57BC',
    deadlineText: '#E28A11',
  },
  in_progress: {
    shell: '#FFE0B8',
    surface: '#FFFDF9',
    eyebrow: '#FF9500',
    chipBg: '#FFF1DE',
    chipText: '#C97300',
    deadlineText: '#E28A11',
  },
  done: {
    shell: '#D6F0BE',
    surface: '#FBFFF6',
    eyebrow: '#58CC02',
    chipBg: '#EDF9E2',
    chipText: '#43A700',
    deadlineText: '#67AF2A',
  },
  locked: {
    shell: '#E8EBF0',
    surface: '#FCFCFD',
    eyebrow: '#B3BAC7',
    chipBg: '#F1F3F7',
    chipText: '#8B95A7',
    deadlineText: '#A6AFBB',
  },
  skipped: {
    shell: '#E8EBF0',
    surface: '#FCFCFD',
    eyebrow: '#B3BAC7',
    chipBg: '#F1F3F7',
    chipText: '#8B95A7',
    deadlineText: '#A6AFBB',
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

export function TaskCard({ node, state, onRefresh }: Props) {
  const { t, langCode } = useLanguage();
  const start = useStartTask();
  const complete = useCompleteTask();

  const title = node.title?.[langCode] ?? node.title?.en ?? node.title?.zh ?? '';
  const description = node.description?.[langCode] ?? node.description?.en ?? node.description?.zh ?? '';
  const deadlineHint = node.deadline_hint?.[langCode] ?? node.deadline_hint?.en ?? null;
  const status = state?.status ?? 'locked';
  const isMain = node.type === 'main';
  const sourceHost = getSourceHost(node.source_url);
  const verificationDate = getVerificationDate(node.last_verified_at, langCode);
  const tone = STATUS_STYLES[status] ?? STATUS_STYLES.locked;

  return (
    <View
      style={{ backgroundColor: tone.shell }}
      className="rounded-[30px] p-[2px] pb-[7px]"
    >
      <View
        style={{ backgroundColor: tone.surface }}
        className="rounded-[28px] border border-white/80 px-4 py-4"
      >
        <View className="mb-3 flex-row items-start gap-3">
          {isMain && (
            <View
              style={{ backgroundColor: tone.chipBg }}
              className="rounded-full px-3 py-1.5"
            >
              <Text
                style={{ color: tone.chipText }}
                className="text-[11px] font-extrabold uppercase tracking-[0.8px]"
              >
                {t.tasks.type_main}
              </Text>
            </View>
          )}
          <View className="flex-1">
            <View
              style={{ backgroundColor: tone.eyebrow }}
              className="mb-2 h-1.5 w-16 rounded-full"
            />
            <Text className="text-[17px] font-extrabold leading-6 text-gray-900">
              {title}
            </Text>
            {description ? (
              <Text className="mt-2 text-sm leading-6 text-gray-500" numberOfLines={3}>
                {description}
              </Text>
            ) : null}
          </View>
        </View>

        {(sourceHost || verificationDate) && (
          <View className="mb-3 flex-row flex-wrap gap-2">
            {sourceHost && node.source_url && (
              <Pressable
                style={{ backgroundColor: tone.chipBg }}
                className="rounded-full px-3 py-2"
                onPress={() => {
                  void Linking.openURL(node.source_url!);
                }}
              >
                <Text style={{ color: tone.chipText }} className="text-xs font-bold">
                  {sourceHost}
                </Text>
              </Pressable>
            )}
            {verificationDate && (
              <View
                style={{ backgroundColor: tone.chipBg }}
                className="rounded-full px-3 py-2"
              >
                <Text style={{ color: tone.chipText }} className="text-xs font-medium">
                  {verificationDate}
                </Text>
              </View>
            )}
          </View>
        )}

        {deadlineHint && (
          <View className="mb-4">
            <Text style={{ color: tone.deadlineText }} className="text-xs font-bold">
              {deadlineHint}
            </Text>
          </View>
        )}

        <View className="flex-row flex-wrap items-center gap-2">
          {status === 'available' && (
            <StackedButton
              label={t.tasks.start}
              onPress={() => start.mutate(node.id, { onSuccess: onRefresh })}
              loading={start.isPending}
              variant="primary"
            />
          )}

          {status === 'in_progress' && (
            <StackedButton
              label={t.tasks.complete}
              onPress={() => complete.mutate(node.id, { onSuccess: onRefresh })}
              loading={complete.isPending}
              variant="success"
            />
          )}

          {status === 'done' && (
            <View className="rounded-full bg-success/10 px-4 py-2">
              <Text className="text-sm font-extrabold text-success">{t.tasks.done}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
