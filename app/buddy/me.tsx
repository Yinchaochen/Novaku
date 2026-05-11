import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BuddyPostCard } from '../../components/buddy/BuddyPostCard';
import { useLanguage } from '../../context/LanguageContext';
import {
  type BuddyPost,
  type BuddyPostBucket,
  useMyBuddyPosts,
} from '../../features/buddyPosts/useBuddyPosts';

const BUCKETS: BuddyPostBucket[] = ['active', 'expired', 'deleted'];

export default function MyBuddyPostsScreen() {
  const { t } = useLanguage();
  const [bucket, setBucket] = useState<BuddyPostBucket>('active');
  const query = useMyBuddyPosts(bucket);
  const items: BuddyPost[] = query.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top']}>
      <View className="flex-row items-center justify-between border-b border-neutral-100 bg-white px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color="#111111" />
        </Pressable>
        <Text className="text-[16px] font-semibold text-black">{t.buddy.my_posts_title}</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Bucket tabs */}
      <View className="flex-row border-b border-neutral-100 bg-white">
        {BUCKETS.map((b) => {
          const active = bucket === b;
          return (
            <Pressable
              key={b}
              onPress={() => setBucket(b)}
              className="flex-1 items-center py-3"
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: active ? '#F47C7C' : '#94A3B8' }}>
                {t.buddy[`my_posts_${b}` as const]}
              </Text>
              {active ? <View className="mt-1 h-[2px] w-8 rounded-full bg-[#F47C7C]" /> : <View className="mt-1 h-[2px] w-8" />}
            </Pressable>
          );
        })}
      </View>

      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F47C7C" />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="paper-plane-outline" size={42} color="#CBD5E1" />
          <Text className="mt-3 text-center text-[14px] text-neutral-400">
            {t.buddy.my_posts_empty}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <BuddyPostCard
              post={item}
              onPress={(p) => router.push(`/buddy/post/${p.id}` as never)}
            />
          )}
          contentContainerStyle={{ padding: 16 }}
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
        />
      )}
    </SafeAreaView>
  );
}
