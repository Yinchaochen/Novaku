import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import type { BuddyPost, BuddyPostCategory } from '../../features/buddyPosts/useBuddyPosts';
import { resolveMediaUrl } from '../../lib/media';

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

const CATEGORY_TINT: Record<BuddyPostCategory, string> = {
  anmeldung: '#FFE2C7',
  medical: '#FFD8DC',
  shopping: '#FFE9A8',
  meal: '#FCE7B4',
  walking: '#D4F0E0',
  language_help: '#D8E2FF',
  errand_carry: '#E0D2FA',
  other: '#E5E7EB',
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

function formatCompanionTime(start: string, end: string, langCode: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const dateFmt = new Intl.DateTimeFormat(langCode, { weekday: 'short', month: 'short', day: 'numeric' });
    const timeFmt = new Intl.DateTimeFormat(langCode, { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateFmt.format(s)} ${timeFmt.format(s)}–${timeFmt.format(e)}`;
  } catch {
    return `${start} → ${end}`;
  }
}

function formatErrandWindow(depart: string, ret: string, langCode: string): string {
  try {
    const fmt = new Intl.DateTimeFormat(langCode, { month: 'short', day: 'numeric' });
    return `${fmt.format(new Date(depart))} → ${fmt.format(new Date(ret))}`;
  } catch {
    return `${depart} → ${ret}`;
  }
}

function GenderIcon({ gender }: { gender: string | null }) {
  if (!gender || gender === 'prefer_not_to_say') return null;
  if (gender === 'female') return <Ionicons name="female" size={11} color="#F47C7C" />;
  if (gender === 'male') return <Ionicons name="male" size={11} color="#5B7FE8" />;
  return <Ionicons name="person" size={11} color="#94A3B8" />;
}

export interface BuddyPostCardProps {
  post: BuddyPost;
  onPress: (post: BuddyPost) => void;
}

export function BuddyPostCard({ post, onPress }: BuddyPostCardProps) {
  const { t, langCode } = useLanguage();
  const avatar = resolveMediaUrl(post.author.avatar_url);
  const priceLabel = formatPrice(post.price_cents, post.currency);
  // Price column reads pricing_mode first. 'free' and 'negotiable-without-amount'
  // both render as a muted text label (no €); 'negotiable-with-amount' and
  // 'fixed' both render the amount in coral.
  const priceText =
    post.pricing_mode === 'free'
      ? t.buddy.field_price_free
      : post.pricing_mode === 'negotiable' && post.price_cents === 0
        ? t.buddy.field_price_negotiable
        : priceLabel;
  const isMutedPrice =
    post.pricing_mode === 'free' ||
    (post.pricing_mode === 'negotiable' && post.price_cents === 0);

  const timeLabel =
    post.type === 'companion' && post.available_at && post.available_until
      ? formatCompanionTime(post.available_at, post.available_until, langCode)
      : post.type === 'errand_carry' && post.depart_date && post.return_date
        ? formatErrandWindow(post.depart_date, post.return_date, langCode)
        : '';

  const cityLabel =
    post.type === 'errand_carry'
      ? `${post.from_city ?? ''} → ${post.to_city ?? ''}`
      : (post.from_city ?? '');

  return (
    <Pressable
      onPress={() => onPress(post)}
      className="mb-3 overflow-hidden rounded-3xl bg-white px-4 py-3"
      style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}
    >
      {/* Top row: author */}
      <View className="flex-row items-center">
        {avatar ? (
          <Image source={avatar} style={{ width: 36, height: 36, borderRadius: 18 }} contentFit="cover" />
        ) : (
          <View className="h-9 w-9 items-center justify-center rounded-full bg-[#FFE6EA]">
            <Text className="text-[14px] font-bold text-[#F47C7C]">
              {(post.author.display_name || '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View className="ml-2 flex-1">
          <View className="flex-row items-center">
            <Text className="text-[14px] font-semibold text-neutral-900" numberOfLines={1}>
              {post.author.display_name}
            </Text>
            <View className="ml-1.5 flex-row items-center">
              <GenderIcon gender={post.author.gender} />
              {post.author.age ? (
                <Text className="ml-0.5 text-[11px] text-neutral-500">{post.author.age}</Text>
              ) : null}
            </View>
          </View>
          <Text className="text-[11px] text-neutral-400">#{post.author.display_id}</Text>
        </View>
        <View
          className="rounded-full px-2 py-1"
          style={{ backgroundColor: CATEGORY_TINT[post.category] }}
        >
          <View className="flex-row items-center">
            <Ionicons name={CATEGORY_ICON[post.category]} size={11} color="#3B2A22" />
            <Text className="ml-1 text-[10px] font-semibold text-[#3B2A22]">
              {t.buddy[`cat_${post.category}` as const]}
            </Text>
          </View>
        </View>
      </View>

      {/* Title + body — preview truncates at 100 chars total */}
      <Text className="mt-2.5 text-[15px] font-bold text-black" numberOfLines={2}>
        {post.title}
      </Text>
      {post.body ? (
        <Text className="mt-1 text-[13px] leading-5 text-neutral-600" numberOfLines={3}>
          {post.body.length > 100 ? `${post.body.slice(0, 100)}…` : post.body}
        </Text>
      ) : null}

      {/* Bottom row: time + city + price */}
      <View className="mt-2.5 flex-row items-center">
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={12} color="#94A3B8" />
          <Text className="ml-1 text-[11.5px] text-neutral-500" numberOfLines={1}>
            {timeLabel}
          </Text>
        </View>
        {cityLabel ? (
          <View className="ml-3 flex-row items-center">
            <Ionicons name="location-outline" size={12} color="#94A3B8" />
            <Text className="ml-1 text-[11.5px] text-neutral-500" numberOfLines={1}>
              {cityLabel}
            </Text>
          </View>
        ) : null}
        <View className="flex-1" />
        <Text
          className="text-[14px] font-bold"
          style={{ color: isMutedPrice ? '#94A3B8' : '#F47C7C' }}
        >
          {priceText}
        </Text>
      </View>
    </Pressable>
  );
}
