import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { SettingsHeader } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import {
  PostSourceChange,
  SourceChangeAction,
  usePostSourceChanges,
  useResolvePostSourceChange,
} from '../../features/admin/useAdminPostSources';
import { openExternalUrl } from '../../lib/links';
import { formatDeadline, formatStart, placeLine } from '../../lib/postUpdates';

/**
 * D-171 queue: what a post's source now says that the job would not apply on
 * its own. Every item has an action that changes what readers see; a queue of
 * notes nobody can act on is how D-130's queue sat for five months.
 */
export default function AdminPostSourcesScreen() {
  const { t, langCode } = useLanguage();
  const { data: items, isLoading } = usePostSourceChanges();
  const resolve = useResolvePostSourceChange();

  const kindLabel = (kind: PostSourceChange['kind']) =>
    ({
      time: t.admin.post_sources_kind_time,
      place: t.admin.post_sources_kind_place,
      deadline: t.admin.post_sources_kind_deadline,
      cancelled: t.admin.post_sources_kind_cancelled,
      postponed: t.admin.post_sources_kind_postponed,
      gone: t.admin.post_sources_kind_gone,
      text: t.admin.post_sources_kind_text,
    })[kind];

  const value = (kind: PostSourceChange['kind'], data: Record<string, unknown>): string => {
    if (kind === 'time' && typeof data.starts_at === 'string') {
      return formatStart(data.starts_at, data.timed as boolean | undefined, langCode);
    }
    if (kind === 'deadline' && typeof data.deadline === 'string') {
      return formatDeadline(data.deadline, langCode);
    }
    if (kind === 'place') {
      return placeLine(data as { venue?: string; address?: string });
    }
    if (typeof data.status === 'string') return data.status;
    return '';
  };

  const run = (item: PostSourceChange, action: SourceChangeAction) => {
    const go = () =>
      resolve.mutate(
        { id: item.id, action },
        {
          onError: (err: unknown) => {
            const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response
              ?.data?.error?.code;
            Alert.alert(
              t.admin.post_sources_title,
              code === 'change_stale' ? t.admin.post_sources_stale : t.common.error,
            );
          },
        },
      );
    if (action === 'dismiss') {
      go();
      return;
    }
    const [title, body] =
      action === 'apply'
        ? [t.admin.post_sources_confirm_apply_title, t.admin.post_sources_confirm_apply_body]
        : [t.admin.post_sources_confirm_expire_title, t.admin.post_sources_confirm_expire_body];
    Alert.alert(title, body, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.confirm, onPress: go },
    ]);
  };

  return (
    <Screen topInset>
      <SettingsHeader title={t.admin.post_sources_title} onBack={() => router.back()} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : !items || items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-[14px] text-gray-500">{t.admin.post_sources_empty}</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 14 }}>
          {items.map((item) => {
            const soonest = item.event_starts_at
              ? t.admin.post_sources_soonest.replace(
                  '{when}',
                  formatStart(item.event_starts_at, undefined, langCode),
                )
              : item.action_deadline_at
                ? `${t.admin.post_sources_kind_deadline}: ${formatDeadline(item.action_deadline_at, langCode)}`
                : null;
            const canApply = ['time', 'deadline', 'place'].includes(item.kind);
            const before = value(item.kind, item.before);
            const after = value(item.kind, item.after);
            const claims = Array.isArray(item.after.claims)
              ? (item.after.claims as { post_says: string; page_says: string }[])
              : [];
            const unverified = item.after.verified === false;
            return (
              <View
                key={item.id}
                className="rounded-3xl bg-white p-4"
                style={{ borderWidth: 1, borderColor: 'rgba(226,220,212,0.8)' }}
              >
                <Text className="text-[11px] font-bold uppercase" style={{ color: '#B07A1E' }}>
                  {kindLabel(item.kind)}
                </Text>
                <Pressable onPress={() => router.push(`/p/${item.post_id}` as never)}>
                  <Text className="mt-1 text-[15px] font-extrabold text-gray-900">{item.post_title}</Text>
                </Pressable>
                {soonest ? <Text className="mt-0.5 text-[12px] text-gray-500">{soonest}</Text> : null}

                {before || after ? (
                  <View className="mt-3">
                    {before ? (
                      <Text className="text-[13px] text-gray-500">
                        {t.admin.post_sources_post_says}: {before}
                      </Text>
                    ) : null}
                    {after ? (
                      <Text className="mt-1 text-[13px] font-semibold text-gray-900">
                        {t.admin.post_sources_source_says}: {after}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {claims.map((claim, index) => (
                  <View key={index} className="mt-2">
                    <Text className="text-[13px] text-gray-500">
                      {t.admin.post_sources_post_says}: {claim.post_says}
                    </Text>
                    <Text className="mt-0.5 text-[13px] font-semibold text-gray-900">
                      {t.admin.post_sources_source_says}: {claim.page_says}
                    </Text>
                  </View>
                ))}

                {typeof item.after.moved_to === 'string' ? (
                  <Text className="mt-2 text-[12px] text-gray-600">
                    {t.admin.post_sources_moved}: {item.after.moved_to}
                  </Text>
                ) : null}

                {item.quote ? (
                  <View className="mt-3 rounded-2xl px-3 py-2" style={{ backgroundColor: 'rgba(176,122,30,0.1)' }}>
                    <Text className="text-[11px] font-bold" style={{ color: '#B07A1E' }}>
                      {t.admin.post_sources_quote}
                    </Text>
                    <Text className="mt-1 text-[13px] leading-5 text-gray-700">{item.quote}</Text>
                  </View>
                ) : null}

                {unverified ? (
                  <Text className="mt-2 text-[12px] text-gray-500">{t.admin.post_sources_unverified}</Text>
                ) : null}

                {item.source_url ? (
                  <Pressable onPress={() => void openExternalUrl(item.source_url)}>
                    <Text className="mt-2 text-[12px] font-semibold" style={{ color: '#FF9F6E' }} numberOfLines={1}>
                      {t.admin.post_sources_source}: {item.source_url}
                    </Text>
                  </Pressable>
                ) : null}

                <View className="mt-4 flex-row gap-2">
                  {canApply ? (
                    <Pressable
                      onPress={() => run(item, 'apply')}
                      disabled={resolve.isPending}
                      className="flex-1 items-center rounded-full py-2.5"
                      style={{ backgroundColor: '#8FBC7A' }}
                    >
                      <Text className="text-[13px] font-bold text-white">{t.admin.post_sources_apply}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => run(item, 'expire')}
                      disabled={resolve.isPending}
                      className="flex-1 items-center rounded-full py-2.5"
                      style={{ backgroundColor: '#E07A6F' }}
                    >
                      <Text className="text-[13px] font-bold text-white">{t.admin.post_sources_expire}</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => run(item, 'dismiss')}
                    disabled={resolve.isPending}
                    className="flex-1 items-center rounded-full py-2.5"
                    style={{ backgroundColor: '#F0E7DE' }}
                  >
                    <Text className="text-[13px] font-bold text-gray-600">{t.admin.post_sources_dismiss}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
