import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BuddyPostCard } from '../../components/buddy/BuddyPostCard';
import { useLanguage } from '../../context/LanguageContext';
import {
  type BuddyPost,
  type BuddyPostCategory,
  useBuddyPostsFeed,
} from '../../features/buddyPosts/useBuddyPosts';
import { useNotifications } from '../../features/community/useCommunity';
import { tap } from '../../lib/haptics';
import { colors, shadows } from '../../theme/tokens';
import { useAuthStore } from '../../store/authStore';

const HERO_YELLOW = '#FFD17E';
const HERO_CORAL = '#F67673';

type CategoryChip = { id: BuddyPostCategory | 'all'; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap };

const CATEGORIES: CategoryChip[] = [
  { id: 'all', icon: 'apps-outline' },
  { id: 'anmeldung', icon: 'document-text-outline' },
  { id: 'medical', icon: 'medkit-outline' },
  { id: 'shopping', icon: 'bag-handle-outline' },
  { id: 'meal', icon: 'restaurant-outline' },
  { id: 'walking', icon: 'walk-outline' },
  { id: 'language_help', icon: 'chatbubbles-outline' },
  { id: 'errand_carry', icon: 'airplane-outline' },
  { id: 'other', icon: 'ellipsis-horizontal-circle-outline' },
];

function categoryLabel(t: ReturnType<typeof useLanguage>['t'], id: BuddyPostCategory | 'all'): string {
  if (id === 'all') return t.buddy.cat_all;
  return t.buddy[`cat_${id}` as const];
}

export default function BuddyTabScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [category, setCategory] = useState<BuddyPostCategory | 'all'>('all');

  const filter = useMemo(
    () => ({
      category: category === 'all' ? undefined : (category as BuddyPostCategory),
      city: user?.city ?? undefined,
    }),
    [category, user?.city],
  );

  const feed = useBuddyPostsFeed(filter);
  const notificationsQuery = useNotifications(true, 'buddy');
  const buddyUnread = notificationsQuery.data?.unread_count ?? 0;
  const items: BuddyPost[] = feed.data?.pages.flatMap((p) => p.items) ?? [];

  const handlePress = (post: BuddyPost) => {
    tap('light');
    router.push(`/buddy/post/${post.id}` as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFAF2' }}>
      {/* Yellow header */}
      <View
        style={{
          backgroundColor: HERO_YELLOW,
          paddingTop: Math.max(insets.top + 8, 30),
          paddingBottom: 16,
          paddingHorizontal: 16,
        }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-[22px] font-extrabold text-[#3B2A22]">{t.buddy.tab_title}</Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => router.push('/buddy/me' as never)}
              hitSlop={6}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                ...shadows.iconButton,
              }}
            >
              <Ionicons name="bookmark-outline" size={18} color="#3B2A22" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/notifications?category=buddy' as never)}
              hitSlop={6}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                ...shadows.iconButton,
              }}
            >
              <Ionicons name="notifications-outline" size={18} color="#3B2A22" />
              {buddyUnread > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    minWidth: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: colors.brandCoral,
                    paddingHorizontal: 3,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700' }}>
                    {Math.min(buddyUnread, 99)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Categories strip */}
      <View style={{ backgroundColor: HERO_CORAL, paddingVertical: 14 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14 }}>
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => {
                  tap('light');
                  setCategory(cat.id);
                }}
                style={{ alignItems: 'center', marginHorizontal: 8 }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isActive ? '#FFFFFF' : '#FFE9A8',
                  }}
                >
                  <Ionicons
                    name={cat.icon}
                    size={22}
                    color={isActive ? colors.brandCoral : '#C75A57'}
                  />
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    fontWeight: isActive ? '700' : '500',
                    color: isActive ? '#FFFFFF' : '#FCE7B4',
                    maxWidth: 64,
                  }}
                >
                  {categoryLabel(t, cat.id)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Feed */}
      <View className="flex-1">
        {feed.isLoading && items.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.brandCoral} />
          </View>
        ) : items.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="paper-plane-outline" size={42} color="#CBD5E1" />
            <Text className="mt-3 text-[15px] font-semibold text-neutral-700">
              {t.buddy.feed_empty_title}
            </Text>
            <Text className="mt-1 text-center text-[13px] text-neutral-400">
              {t.buddy.feed_empty_hint}
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => <BuddyPostCard post={item} onPress={handlePress} />}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100 }}
            onEndReached={() => {
              if (feed.hasNextPage && !feed.isFetchingNextPage) {
                feed.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              feed.isFetchingNextPage ? (
                <View className="py-4">
                  <ActivityIndicator size="small" color={colors.brandCoral} />
                </View>
              ) : null
            }
            refreshing={feed.isRefetching}
            onRefresh={() => feed.refetch()}
          />
        )}
      </View>

      {/* Floating compose */}
      <Pressable
        onPress={() => {
          tap('medium');
          router.push('/buddy/compose' as never);
        }}
        style={{
          position: 'absolute',
          right: 18,
          bottom: insets.bottom + 90,
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.brandCoral,
          shadowColor: colors.brandCoral,
          shadowOpacity: 0.4,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
