import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../../../context/LanguageContext';
import {
  type BuddyPost,
  type BuddyPostCategory,
  useBuddyPost,
  useChatByBuddyPost,
  useDeleteBuddyPost,
} from '../../../features/buddyPosts/useBuddyPosts';
import { resolveMediaUrl } from '../../../lib/media';
import { useSearchIntentStore } from '../../../store/searchIntentStore';

const CATEGORY_ICON: Record<BuddyPostCategory, keyof typeof Ionicons.glyphMap> = {
  anmeldung: 'document-text-outline',
  medical: 'medkit-outline',
  shopping: 'bag-handle-outline',
  meal: 'restaurant-outline',
  walking: 'walk-outline',
  language_help: 'chatbubbles-outline',
  errand_carry: 'airplane-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

function formatPrice(cents: number, currency: string): string {
  if (cents === 0) return '';
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatTime(post: BuddyPost, langCode: string): string {
  try {
    if (post.type === 'companion' && post.available_at && post.available_until) {
      const s = new Date(post.available_at);
      const e = new Date(post.available_until);
      const dateFmt = new Intl.DateTimeFormat(langCode, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timeFmt = new Intl.DateTimeFormat(langCode, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${dateFmt.format(s)} · ${timeFmt.format(s)}–${timeFmt.format(e)}`;
    }
    if (post.type === 'errand_carry' && post.depart_date && post.return_date) {
      const fmt = new Intl.DateTimeFormat(langCode, { month: 'long', day: 'numeric' });
      return `${fmt.format(new Date(post.depart_date))} → ${fmt.format(new Date(post.return_date))}`;
    }
  } catch {
    // fall through
  }
  return '';
}

export default function BuddyPostDetailScreen() {
  const { t, langCode } = useLanguage();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const postId = typeof params.id === 'string' ? params.id : null;

  const query = useBuddyPost(postId);
  const startChat = useChatByBuddyPost();
  const deletePost = useDeleteBuddyPost();
  const setOpenIntent = useSearchIntentStore((s) => s.setOpenIntent);

  const post = query.data;

  const handleContact = async () => {
    if (!post) return;
    try {
      const res = await startChat.mutateAsync(post.id);
      // Hand the Social tab the conversation id + origin via the intent store.
      // Its useEffect picks this up, flips conversationOrigin to 'buddy_post',
      // and auto-opens the chat — so the user lands inside the conversation,
      // not on a generic Social landing.
      setOpenIntent({ conversationId: res.id, origin: 'buddy_post' });
      router.push('/(tabs)/social' as never);
    } catch (err) {
      Alert.alert(t.common.error, (err as Error).message ?? '');
    }
  };

  const handleDelete = () => {
    if (!post) return;
    Alert.alert(t.buddy.delete_post_confirm, undefined, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.confirm,
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost.mutateAsync(post.id);
            router.back();
          } catch (err) {
            Alert.alert(t.common.error, (err as Error).message ?? '');
          }
        },
      },
    ]);
  };

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white" edges={['top']}>
        <ActivityIndicator size="large" color="#F47C7C" />
      </SafeAreaView>
    );
  }

  if (query.isError || !post) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color="#111111" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={56} color="#D1D5DB" />
          <Text className="mt-3 text-[15px] font-medium text-neutral-700">
            {t.buddy.errors.post_not_found}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const avatar = resolveMediaUrl(post.author.avatar_url);
  const priceLabel = formatPrice(post.price_cents, post.currency);
  const timeLabel = formatTime(post, langCode);
  const cityLabel =
    post.type === 'errand_carry' && post.from_city && post.to_city
      ? `${post.from_city} → ${post.to_city}`
      : post.from_city ?? '';

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top']}>
      <View className="flex-row items-center justify-between border-b border-neutral-100 bg-white px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color="#111111" />
        </Pressable>
        <Text className="text-[16px] font-semibold text-black" numberOfLines={1}>
          {t.buddy[`cat_${post.category}` as const]}
        </Text>
        {post.is_owner ? (
          <Pressable onPress={handleDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color="#F47C7C" />
          </Pressable>
        ) : (
          <View style={{ width: 20 }} />
        )}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Author card */}
        <Pressable
          onPress={() => router.push({ pathname: '/users/[id]', params: { id: post.author.id } })}
          className="mb-3 flex-row items-center rounded-3xl bg-white px-4 py-3"
          style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}
        >
          {avatar ? (
            <Image source={avatar} style={{ width: 50, height: 50, borderRadius: 25 }} contentFit="cover" />
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-full bg-[#FFE6EA]">
              <Text className="text-[18px] font-bold text-[#F47C7C]">
                {post.author.display_name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View className="ml-3 flex-1">
            <Text className="text-[16px] font-bold text-neutral-900">{post.author.display_name}</Text>
            <View className="mt-0.5 flex-row items-center">
              <Text className="text-[12px] text-neutral-400">#{post.author.display_id}</Text>
              {post.author.gender && post.author.gender !== 'prefer_not_to_say' ? (
                <Text className="ml-2 text-[12px] text-neutral-500">
                  {post.author.gender === 'male'
                    ? t.buddy.gender_male
                    : post.author.gender === 'female'
                      ? t.buddy.gender_female
                      : t.buddy.gender_non_binary}
                </Text>
              ) : null}
              {post.author.age ? (
                <Text className="ml-2 text-[12px] text-neutral-500">{post.author.age}</Text>
              ) : null}
              {post.author.city ? (
                <Text className="ml-2 text-[12px] text-neutral-500">· {post.author.city}</Text>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </Pressable>

        {/* Title + body */}
        <View className="mb-3 rounded-3xl bg-white px-4 py-4" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}>
          <View className="mb-2 flex-row items-center">
            <Ionicons name={CATEGORY_ICON[post.category]} size={16} color="#F47C7C" />
            <Text className="ml-2 text-[12px] font-semibold uppercase tracking-wider text-[#F47C7C]">
              {t.buddy[`type_${post.type}` as const]} · {t.buddy[`cat_${post.category}` as const]}
            </Text>
          </View>
          <Text className="text-[19px] font-extrabold text-black">{post.title}</Text>
          <Text className="mt-2 text-[14px] leading-6 text-neutral-700">{post.body}</Text>
        </View>

        {/* Time */}
        {timeLabel ? (
          <View className="mb-3 flex-row items-center rounded-3xl bg-white px-4 py-3.5" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}>
            <Ionicons name="time-outline" size={18} color="#94A3B8" />
            <Text className="ml-2 flex-1 text-[14px] text-neutral-700">{timeLabel}</Text>
          </View>
        ) : null}

        {/* Location */}
        {cityLabel ? (
          <View className="mb-3 rounded-3xl bg-white px-4 py-3.5" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}>
            <View className="flex-row items-center">
              <Ionicons name="location-outline" size={18} color="#94A3B8" />
              <Text className="ml-2 flex-1 text-[14px] text-neutral-700">{cityLabel}</Text>
            </View>
            {post.type === 'errand_carry' && post.accepts_shipping ? (
              <View className="mt-2 flex-row items-center">
                <Ionicons name="cube-outline" size={14} color="#5B7FE8" />
                <Text className="ml-1.5 text-[12px] text-[#5B7FE8]">
                  {t.buddy.field_accepts_shipping}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Price — pricing_mode decides whether the user picked Free,
            Negotiable (with or without a starting amount), or a Fixed price. */}
        <View className="rounded-3xl bg-white px-4 py-4" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}>
          <Text className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
            {t.buddy.field_price}
          </Text>
          {post.pricing_mode === 'free' ? (
            <Text className="mt-1 text-[24px] font-extrabold" style={{ color: '#94A3B8' }}>
              {t.buddy.field_price_free}
            </Text>
          ) : post.pricing_mode === 'negotiable' && post.price_cents === 0 ? (
            <Text className="mt-1 text-[24px] font-extrabold" style={{ color: '#94A3B8' }}>
              {t.buddy.field_price_negotiable}
            </Text>
          ) : (
            <>
              <Text className="mt-1 text-[24px] font-extrabold" style={{ color: '#F47C7C' }}>
                {priceLabel}
              </Text>
              {post.pricing_mode === 'negotiable' ? (
                <Text className="mt-1 text-[12px] font-medium text-neutral-500">
                  · {t.buddy.field_price_negotiable}
                </Text>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      {/* Sticky bottom: contact button (hidden if owner) */}
      {!post.is_owner ? (
        <View
          className="border-t border-neutral-100 bg-white px-4 pb-4 pt-3"
          style={{ paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 24) : 24 }}
        >
          <Pressable
            onPress={() => void handleContact()}
            disabled={startChat.isPending}
            className="items-center justify-center rounded-full bg-[#111827] py-3.5"
          >
            {startChat.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text className="text-[15px] font-bold text-white">{t.buddy.contact_button}</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
