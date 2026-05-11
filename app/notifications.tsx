import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import {
  CommunityNotification,
  type NotificationCategory,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../features/community/useCommunity';
import { resolveMediaUrl } from '../lib/media';

function timeAgo(value: string, langCode: string) {
  try {
    const diffMs = Date.now() - new Date(value).getTime();
    const minutes = Math.round(diffMs / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d`;
    return new Intl.DateTimeFormat(langCode, { month: 'short', day: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const resolved = resolveMediaUrl(avatarUrl);
  if (resolved) {
    return (
      <Image source={resolved} contentFit="cover" style={{ width: 42, height: 42, borderRadius: 21 }} />
    );
  }
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: 42, height: 42, backgroundColor: '#FFE6EA' }}
    >
      <Text style={{ color: '#F47C7C', fontSize: 16, fontWeight: '700' }}>
        {name.trim().slice(0, 1).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const { t, langCode } = useLanguage();
  const params = useLocalSearchParams<{ category?: string }>();
  const category: NotificationCategory | undefined =
    params.category === 'social' || params.category === 'buddy' ? params.category : undefined;
  const query = useNotifications(true, category);
  const markAll = useMarkAllNotificationsRead(category);
  const markOne = useMarkNotificationRead();

  // Auto-mark-all-read on screen open (viewing the list = acknowledging).
  useEffect(() => {
    if (query.data && query.data.unread_count > 0 && !markAll.isPending) {
      markAll.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data?.unread_count]);

  const handleOpen = (n: CommunityNotification) => {
    if (!n.read_at) {
      markOne.mutate(n.id);
    }
    if (n.post_id) {
      // Plaza tab handles post detail; we don't have a direct route, so just navigate to plaza.
      router.push('/(tabs)/plaza');
    } else {
      // For follow-only, take user to social.
      router.push('/(tabs)/social');
    }
  };

  const items = query.data?.items ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center border-b border-neutral-100 px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color="#111111" />
        </Pressable>
        <Text className="ml-2 text-[18px] font-semibold text-black">
          {t.notifications.title}
        </Text>
      </View>

      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F47C7C" />
        </View>
      ) : query.isError ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-danger">{t.common.error}</Text>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
          <Text className="mt-3 text-[15px] font-medium text-neutral-700">
            {t.notifications.empty_title}
          </Text>
          <Text className="mt-1 text-center text-[13px] text-neutral-400">
            {t.notifications.empty_hint}
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1">
          {items.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => handleOpen(n)}
              className="flex-row gap-3 border-b border-neutral-100 px-4 py-3 active:bg-neutral-50"
              style={{ backgroundColor: n.read_at ? 'transparent' : '#FFF8F9' }}
            >
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  if (!n.read_at) markOne.mutate(n.id);
                  router.push(`/users/${n.actor.id}` as never);
                }}
                hitSlop={4}
              >
                <Avatar name={n.actor.display_name} avatarUrl={n.actor.avatar_url} />
              </Pressable>
              <View className="flex-1">
                <Text className="text-[14px] leading-5 text-black">
                  <Text className="font-semibold">{n.actor.display_name}</Text>{' '}
                  <Text className="text-neutral-700">
                    {n.type === 'follow'
                      ? t.notifications.followed_you
                      : n.type === 'comment_reply'
                      ? t.notifications.replied_to_you
                      : t.notifications.mentioned_you}
                  </Text>
                </Text>
                {n.comment_excerpt ? (
                  <Text numberOfLines={2} className="mt-1 text-[13px] text-neutral-500">
                    “{n.comment_excerpt}”
                  </Text>
                ) : n.post_title ? (
                  <Text numberOfLines={1} className="mt-1 text-[13px] text-neutral-500">
                    {n.post_title}
                  </Text>
                ) : null}
                <Text className="mt-1 text-[11px] text-neutral-400">
                  {timeAgo(n.created_at, langCode)}
                </Text>
              </View>
              {!n.read_at ? (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#F47C7C',
                    marginTop: 6,
                  }}
                />
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
