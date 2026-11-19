import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import {
  type Merchant,
  type MerchantCategory,
  type ProductCard,
  WEEKDAYS,
  type Weekday,
  useShop,
  useShopProducts,
} from '../../features/merchants/useMerchants';
import { openExternalUrl } from '../../lib/links';
import { formatPrice, formatRanges } from '../../lib/merchantFormat';
import { resolveMediaUrl } from '../../lib/media';
import { colors } from '../../theme/tokens';

type T = ReturnType<typeof useLanguage>['t'];

export function categoryLabel(t: T, category: MerchantCategory, other: string | null): string {
  if (category === 'other') return other || t.merchant.category_other;
  return t.merchant[`category_${category}`];
}

export function dayLabel(t: T, day: Weekday): string {
  return t.merchant[`day_${day}`];
}

export function todayWeekday(): Weekday {
  return WEEKDAYS[(new Date().getDay() + 6) % 7];
}

export function priceLabel(t: T, langCode: string, cents: number | null, currency: string): string {
  return cents === null ? t.merchant.ask_in_shop : formatPrice(cents, currency, langCode);
}

export function mapsUrl(shop: Pick<Merchant, 'latitude' | 'longitude' | 'place_id' | 'place_name'>): string {
  const query =
    shop.latitude !== null && shop.longitude !== null ? `${shop.latitude},${shop.longitude}` : shop.place_name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&query_place_id=${encodeURIComponent(shop.place_id)}`;
}

/** "Bakery · Open now · today 07:00–18:00", the line under a shop's name. */
export function ShopStatusLine({ shop, color = colors.textMuted }: { shop: Merchant; color?: string }) {
  const { t } = useLanguage();
  const today = shop.today_hours.length ? formatRanges(shop.today_hours) : t.merchant.hours_closed;
  return (
    <Text style={{ fontSize: 13, color }} numberOfLines={2}>
      {categoryLabel(t, shop.category, shop.category_other)} ·{' '}
      <Text style={{ fontWeight: '700', color: shop.open_now ? '#2F6B45' : color }}>
        {shop.open_now ? t.merchant.open_now : t.merchant.closed_now}
      </Text>{' '}
      · {t.merchant.today} {today}
    </Text>
  );
}

function ProductTile({ product, owner }: { product: ProductCard; owner: boolean }) {
  const { t, langCode } = useLanguage();
  const cover = resolveMediaUrl(product.cover_url);
  return (
    <Pressable
      testID="shop.product.tile"
      accessibilityRole="button"
      accessibilityLabel={product.name}
      onPress={() => router.push(`/products/${product.id}`)}
      style={{ width: '48%', marginBottom: 16 }}
    >
      <View style={{ aspectRatio: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.bgWarmDeep }}>
        {cover ? <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
        {owner && product.status === 'hidden' ? (
          <View
            style={{
              position: 'absolute',
              left: 8,
              top: 8,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
              backgroundColor: 'rgba(36,26,22,0.72)',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{t.merchant.hidden}</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ marginTop: 6, fontSize: 15, fontWeight: '800', color: colors.textMain }} numberOfLines={2}>
        {product.name}
      </Text>
      <Text
        style={{
          marginTop: 2,
          fontSize: product.price_gross_cents === null ? 13 : 15,
          fontWeight: product.price_gross_cents === null ? '400' : '800',
          color: product.price_gross_cents === null ? colors.textMuted : colors.textMain,
        }}
      >
        {priceLabel(t, langCode, product.price_gross_cents, product.currency)}
      </Text>
    </Pressable>
  );
}

export function ShopProductsPane({ userId, owner }: { userId: string; owner: boolean }) {
  const { t } = useLanguage();
  const products = useShopProducts(userId);
  if (products.isLoading) {
    return (
      <View style={{ marginTop: 32, alignItems: 'center' }}>
        <ActivityIndicator color={colors.brandCoral} />
      </View>
    );
  }
  if (products.isError) {
    return <Text style={{ marginTop: 24, textAlign: 'center', color: colors.textDanger }}>{t.common.error}</Text>;
  }
  const items = products.data ?? [];
  if (items.length === 0) {
    return (
      <View
        testID="shop.products.empty"
        style={{ marginTop: 16, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 28, padding: 24 }}
      >
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textMain }}>{t.merchant.no_products}</Text>
        <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 22, textAlign: 'center', color: colors.textMuted }}>
          {owner ? t.merchant.no_products_owner : t.merchant.no_products_visitor}
        </Text>
      </View>
    );
  }
  return (
    <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      {items.map((product) => (
        <ProductTile key={product.id} product={product} owner={owner} />
      ))}
    </View>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function InfoRow({ label, action, onPress }: { label: string; action?: string; onPress?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 10 }}>
      <Text style={{ flex: 1, fontSize: 14, color: colors.textMain }}>{label}</Text>
      {action && onPress ? (
        <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.brandCoral }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ShopHoursPane({ userId, owner }: { userId: string; owner: boolean }) {
  const { t } = useLanguage();
  const shop = useShop(userId);
  if (shop.isLoading) {
    return (
      <View style={{ marginTop: 32, alignItems: 'center' }}>
        <ActivityIndicator color={colors.brandCoral} />
      </View>
    );
  }
  if (!shop.data) {
    return <Text style={{ marginTop: 24, textAlign: 'center', color: colors.textDanger }}>{t.common.error}</Text>;
  }
  const data = shop.data;
  const today = todayWeekday();
  return (
    <View testID="shop.hours" style={{ marginTop: 12 }}>
      {WEEKDAYS.map((day) => {
        const ranges = data.opening_hours[day] ?? [];
        const isToday = day === today;
        return (
          <View
            key={day}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: '#F3ECE6',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: isToday ? '800' : '400', color: colors.textMain }}>{dayLabel(t, day)}</Text>
              {isToday ? (
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: colors.brandCoral,
                    backgroundColor: '#FFE3D6',
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    overflow: 'hidden',
                  }}
                >
                  {t.merchant.today}
                </Text>
              ) : null}
            </View>
            <Text style={{ fontSize: 15, fontWeight: isToday ? '800' : '600', color: ranges.length ? colors.textMain : colors.textMuted }}>
              {ranges.length ? formatRanges(ranges) : t.merchant.hours_closed}
            </Text>
          </View>
        );
      })}
      <View style={{ marginTop: 8 }}>
        {data.address ? (
          <InfoRow label={data.address} action={t.merchant.directions} onPress={() => void openExternalUrl(mapsUrl(data))} />
        ) : null}
        {data.phone ? (
          <InfoRow label={data.phone} action={t.merchant.call} onPress={() => void openExternalUrl(`tel:${data.phone}`)} />
        ) : null}
        {data.impressum_url ? (
          <InfoRow
            label={hostOf(data.impressum_url)}
            action={t.merchant.impressum}
            onPress={() => void openExternalUrl(data.impressum_url)}
          />
        ) : null}
      </View>
      {owner ? (
        <Pressable
          testID="shop.edit"
          accessibilityRole="button"
          onPress={() => router.push('/shop/edit')}
          style={{ marginTop: 16, minHeight: 46, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E8E0DA', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textMain }}>{t.merchant.edit_shop}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
