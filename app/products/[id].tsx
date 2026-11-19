import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShopChip } from '../../components/merchant/ShopChip';
import { categoryLabel, mapsUrl, priceLabel } from '../../components/merchant/ShopPanes';
import { useLanguage } from '../../context/LanguageContext';
import { useProduct, useProductReviews, useShop, useToggleProductSave } from '../../features/merchants/useMerchants';
import { formatRanges } from '../../lib/merchantFormat';
import { resolveMediaUrl } from '../../lib/media';
import { requireSignIn } from '../../store/signInPromptStore';
import { usePlazaComposeIntentStore } from '../../store/plazaComposeIntentStore';
import { colors } from '../../theme/tokens';

type ReviewPost = { id: string; title?: string; body?: string; created_at?: string; author?: { display_name?: string } };

// A product's page (D-195): photos, price, the shop, other people's reviews; Save and Write a review.
export default function ProductScreen() {
  const { t, langCode } = useLanguage();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useProduct(id);
  const reviews = useProductReviews(id);
  const shop = useShop(product.data?.merchant_user_id);
  const toggleSave = useToggleProductSave(id);
  const [aboutOpen, setAboutOpen] = useState(false);
  const width = Math.min(Dimensions.get('window').width, 640);

  if (product.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCream }}>
        <ActivityIndicator color={colors.brandCoral} />
      </View>
    );
  }
  if (!product.data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bgCream, gap: 12 }}>
        <Text style={{ fontSize: 16, color: colors.textMain, textAlign: 'center' }}>{t.merchant.unavailable}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ fontWeight: '800', color: colors.brandCoral }}>{t.common.back}</Text>
        </Pressable>
      </View>
    );
  }

  const data = product.data;
  const merchant = data.merchant;
  const today = merchant.today_hours.length ? formatRanges(merchant.today_hours) : t.merchant.hours_closed;

  const startReview = () => {
    const place = shop.data
      ? {
          name: shop.data.place_name,
          subtitle: shop.data.address ?? '',
          source_url: mapsUrl(shop.data),
          latitude: shop.data.latitude,
          longitude: shop.data.longitude,
        }
      : null;
    usePlazaComposeIntentStore.getState().setIntent({
      kind: 'review',
      product: {
        id: data.id,
        merchant_user_id: data.merchant_user_id,
        name: data.name,
        price_gross_cents: data.price_gross_cents,
        currency: data.currency,
        cover_url: data.media_items[0]?.thumb_url || data.media_items[0]?.media_url || null,
        status: data.status,
      },
      place,
    });
    router.navigate('/(tabs)/plaza');
  };
  const writeReview = () => requireSignIn(startReview);

  const reviewItems = (reviews.data ?? []) as ReviewPost[];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCream }} testID="product.screen">
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        <View style={{ height: 300 + insets.top, backgroundColor: colors.bgWarmDeep }}>
          {data.media_items.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {data.media_items.map((item, index) => (
                <Image
                  key={`${item.media_url}-${index}`}
                  source={{ uri: resolveMediaUrl(item.media_url) ?? undefined }}
                  style={{ width, height: 300 + insets.top }}
                  contentFit="cover"
                  accessibilityLabel={data.name}
                />
              ))}
            </ScrollView>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
            onPress={() => router.back()}
            style={{ position: 'absolute', left: 16, top: insets.top + 12, width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFBF6', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textMain} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 6 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textMain }}>{data.name}</Text>
          <Text style={{ fontSize: data.price_gross_cents === null ? 15 : 24, fontWeight: '800', color: data.price_gross_cents === null ? colors.textMuted : colors.textMain }}>
            {priceLabel(t, langCode, data.price_gross_cents, data.currency)}
          </Text>
          {data.description ? <Text style={{ fontSize: 15, lineHeight: 26, color: colors.textBrown }}>{data.description}</Text> : null}
        </View>

        <Pressable
          testID="product.shop"
          accessibilityRole="button"
          onPress={() => router.push(`/users/${merchant.user_id}`)}
          style={{ marginHorizontal: 20, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECE4DE', borderRadius: 20, padding: 12 }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFE4E6', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.brandCoral, fontWeight: '800' }}>{merchant.place_name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textMain, flexShrink: 1 }} numberOfLines={1}>{merchant.place_name}</Text>
              <ShopChip />
            </View>
            <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>
              <Text style={{ fontWeight: '700', color: merchant.open_now ? '#2F6B45' : colors.textMuted }}>
                {merchant.open_now ? t.merchant.open_now : t.merchant.closed_now}
              </Text>
              {` · ${t.merchant.today} ${today} · ${categoryLabel(t, merchant.category, merchant.category_other)}`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
        </Pressable>

        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textMain }}>{t.merchant.reviews_title}</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textSubtle }}>{data.review_count}</Text>
            <Pressable
              testID="product.about-reviews"
              accessibilityRole="button"
              accessibilityState={{ expanded: aboutOpen }}
              onPress={() => setAboutOpen((open) => !open)}
              style={{ marginLeft: 'auto', minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={{ fontSize: 13, color: colors.textMuted }}>{t.merchant.about_reviews}</Text>
            </Pressable>
          </View>
          {aboutOpen ? (
            <Text testID="product.about-reviews-body" style={{ fontSize: 13, lineHeight: 21, color: colors.textBrown, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12 }}>
              {t.merchant.about_reviews_body}
            </Text>
          ) : null}
          {reviews.isLoading ? <ActivityIndicator color={colors.brandCoral} /> : null}
          {!reviews.isLoading && reviewItems.length === 0 ? (
            <Text style={{ fontSize: 14, color: colors.textMuted }}>{t.merchant.no_reviews}</Text>
          ) : null}
          {reviewItems.map((post) => (
            <Pressable
              key={post.id}
              testID="product.review"
              accessibilityRole="button"
              onPress={() => router.push(`/p/${post.id}`)}
              style={{ flexDirection: 'row', gap: 10 }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFE4DE', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.brandCoral }}>
                  {(post.author?.display_name ?? '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  <Text style={{ fontWeight: '700', color: colors.textMain }}>{post.author?.display_name}</Text>
                  {post.created_at ? ` · ${new Date(post.created_at).toLocaleDateString(langCode)}` : ''}
                </Text>
                {post.title ? <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMain }} numberOfLines={1}>{post.title}</Text> : null}
                {post.body ? <Text style={{ fontSize: 14, lineHeight: 22, color: colors.textBrown }} numberOfLines={2}>{post.body}</Text> : null}
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EFE7E1', paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 4 }}>
        {data.viewer_is_owner ? (
          <Pressable
            testID="product.edit"
            accessibilityRole="button"
            onPress={() => router.push(`/products/new?id=${data.id}`)}
            style={{ flex: 1, minHeight: 50, borderRadius: 999, backgroundColor: colors.brandCoral, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF' }}>{t.merchant.edit_product}</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              testID="product.save"
              accessibilityRole="button"
              accessibilityState={{ selected: data.viewer_saved }}
              onPress={() => requireSignIn(() => toggleSave.mutate(!data.viewer_saved))}
              style={{ minHeight: 50, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1.5, borderColor: data.viewer_saved ? '#FBC5B5' : '#E5E7EB', backgroundColor: data.viewer_saved ? '#FFF4EE' : '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Ionicons name={data.viewer_saved ? 'star' : 'star-outline'} size={20} color={data.viewer_saved ? colors.brandCoral : colors.textMain} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: data.viewer_saved ? '#E9605A' : colors.textMain }}>
                {data.viewer_saved ? t.merchant.saved_product : t.merchant.save}
              </Text>
            </Pressable>
            <Pressable
              testID="product.write-review"
              accessibilityRole="button"
              onPress={writeReview}
              style={{ flex: 1, minHeight: 50, borderRadius: 999, backgroundColor: colors.brandCoral, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF' }}>{t.merchant.write_review}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
