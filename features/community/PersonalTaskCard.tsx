import { Linking, Pressable, Text, View } from 'react-native';

import { StackedButton } from '../../components/StackedButton';
import { useLanguage } from '../../context/LanguageContext';
import {
  PersonalTask,
  useCompletePersonalTask,
  useRefreshPersonalTaskVerification,
  useStartPersonalTask,
} from './useCommunity';

interface Props {
  task: PersonalTask;
}

function getSourceHost(sourceUrl: string | null | undefined) {
  if (!sourceUrl) return null;
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return sourceUrl;
  }
}

function formatDate(value: string | null | undefined, langCode: string) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat(langCode, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}

export function PersonalTaskCard({ task }: Props) {
  const { t, langCode } = useLanguage();
  const start = useStartPersonalTask();
  const complete = useCompletePersonalTask();
  const refreshVerification = useRefreshPersonalTaskVerification();
  const sourceHost = getSourceHost(task.source_url);
  const verificationDate = formatDate(task.last_verified_at, langCode);
  const nextVerifyDate = formatDate(task.next_verify_at, langCode);
  const scorePercent = Math.round(task.reliability_score * 100);

  return (
    <View style={{ backgroundColor: '#FFD9A8' }} className="rounded-[30px] p-[2px] pb-[7px]">
      <View className="rounded-[28px] border border-white/80 bg-[#FFFDF8] px-4 py-4">
        <View className="mb-3 flex-row items-start gap-3">
          <View className="rounded-full bg-secondary/10 px-3 py-1.5">
            <Text className="text-[11px] font-extrabold uppercase tracking-[0.8px] text-secondary">
              {t.plaza.personal_task_badge}
            </Text>
          </View>
          <View className="flex-1">
            <View className="mb-2 h-1.5 w-16 rounded-full bg-secondary" />
            <Text className="text-[17px] font-extrabold leading-6 text-gray-900">{task.title}</Text>
            {task.description ? (
              <Text className="mt-2 text-sm leading-6 text-gray-500">{task.description}</Text>
            ) : null}
          </View>
        </View>

        <View className="mb-4 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-[#FFF1DE] px-3 py-2">
            <Text className="text-xs font-medium text-[#C97300]">
              {t.plaza[`verification_${task.verification_status}`]} - {scorePercent}%
            </Text>
          </View>
          {verificationDate ? (
            <View className="rounded-full bg-[#FFF1DE] px-3 py-2">
              <Text className="text-xs font-medium text-[#C97300]">{verificationDate}</Text>
            </View>
          ) : null}
          {nextVerifyDate ? (
            <View className="rounded-full bg-[#FFF1DE] px-3 py-2">
              <Text className="text-xs font-medium text-[#C97300]">
                {t.plaza.verify_again} {nextVerifyDate}
              </Text>
            </View>
          ) : null}
          {sourceHost && task.source_url ? (
            <Pressable
              className="rounded-full bg-[#FFF1DE] px-3 py-2"
              onPress={() => {
                void Linking.openURL(task.source_url!);
              }}
            >
              <Text className="text-xs font-bold text-[#C97300]">{sourceHost}</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row flex-wrap items-center gap-2">
          {task.status === 'available' ? (
            <StackedButton
              label={t.tasks.start}
              onPress={() => start.mutate(task.id)}
              loading={start.isPending}
              variant="primary"
            />
          ) : null}

          {task.status === 'in_progress' ? (
            <StackedButton
              label={t.tasks.complete}
              onPress={() => complete.mutate(task.id)}
              loading={complete.isPending}
              variant="success"
            />
          ) : null}

          <StackedButton
            label={t.plaza.refresh_verification}
            onPress={() => refreshVerification.mutate(task.id)}
            loading={refreshVerification.isPending}
            variant="neutral"
          />

          {task.status === 'done' ? (
            <View className="rounded-full bg-success/10 px-4 py-2">
              <Text className="text-sm font-extrabold text-success">{t.tasks.done}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
