import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { categoryLabel, priceLabel } from './ShopPanes';
import { useLanguage } from '../../context/LanguageContext';
import { type ProductCard, type ShopSearchResult, useShopProducts, useShopSearch } from '../../features/merchants/useMerchants';
import { resolveMediaUrl } from '../../lib/media';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/tokens';

export const MAX_LINKED_PRODUCTS = 3;

// "Link products" in the composer (D-195 fourth addendum): search a shop, open it, tick its products.
// A shop account skips the search and picks from its own products. It replaces the composer's
// content while open instead of stacking a second Modal (iOS insets, IOS-LOGIN-109), like LocationPicker.
export function ProductPickerPanel({
  initial,
  insets,
  onClose,
  onDone,
}: {
  initial: ProductCard[];
  insets: { top: number; bottom: number };
  onClose: () => void;
  onDone: (products: ProductCard[]) => void;
}) {
  const { t, langCode } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const ownShopId = user?.account_kind === 'merchant' ? user.id : null;
  const [query, setQuery] = useState('');
  const [shop, setShop] = useState<ShopSearchResult | null>(null);
  const [picked, setPicked] = useState<ProductCard[]>(initial);

  const shopId = ownShopId ?? shop?.user_id ?? null;
  const search = useShopSearch(query, !ownShopId && !shop);
  const products = useShopProducts(shopId);
  const items = (products.data ?? []).filter((product) => product.status === 'active');

  const toggle = (product: ProductCard) => {
    setPicked((current) => {
      if (current.some((item) => item.id === product.id)) return current.filter((item) => item.id !== product.id);
      if (current.length >= MAX_LINKED_PRODUCTS) return current;
      return [...current, product];
    });
  };

  return (
    <View testID="picker.panel" style={{ flex: 1, backgroundColor: colors.bgCream, paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 52 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
            onPress={() => (shop && !ownShopId ? setShop(null) : onClose())}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textBrown} />
          </Pressable>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: colors.textMain }}>
            {shop ? shop.place_name : t.merchant.pick_title}
          </Text>
          <Pressable
            testID="picker.done"
            accessibilityRole="button"
            onPress={() => onDone(picked)}
            style={{ minWidth: 44, height: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.brandCoral }}>{t.merchant.pick_done}</Text>
          </Pressable>
        </View>
        <Text style={{ textAlign: 'center', fontSize: 13, color: colors.textMuted }}>
          {t.merchant.pick_selected.replace('{count}', String(picked.length)).replace('{max}', String(MAX_LINKED_PRODUCTS))}
        </Text>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 16, gap: 10 }} keyboardShouldPersistTaps="handled">
          {!shopId ? (
            <>
              <TextInput
                testID="picker.shop-search"
                accessibilityLabel={t.merchant.shop_search_placeholder}
                value={query}
                onChangeText={setQuery}
                placeholder={t.merchant.shop_search_placeholder}
                placeholderTextColor={colors.textSubtle}
                autoFocus
                style={{ minHeight: 48, borderRadius: 999, borderWidth: 1.5, borderColor: '#EADFD6', backgroundColor: '#FFFFFF', paddingHorizontal: 18, fontSize: 16, color: colors.textMain }}
              />
              {search.isFetching ? <ActivityIndicator color={colors.brandCoral} style={{ marginTop: 16 }} /> : null}
              {search.isSuccess && (search.data ?? []).length === 0 ? (
                <Text style={{ marginTop: 16, textAlign: 'center', color: colors.textMuted }}>{t.merchant.shop_search_empty}</Text>
              ) : null}
              {(search.data ?? []).map((item) => (
                <Pressable
                  key={item.user_id}
                  testID="picker.shop"
                  accessibilityRole="button"
                  onPress={() => setShop(item)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 12 }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFE4E6', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: colors.brandCoral, fontWeight: '800' }}>{item.place_name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textMain }} numberOfLines={1}>{item.place_name}</Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>
                      {categoryLabel(t, item.category, item.category_other)}
                      {item.address ? ` · ${item.address}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
                </Pressable>
              ))}
            </>
          ) : products.isLoading ? (
            <ActivityIndicator color={colors.brandCoral} style={{ marginTop: 24 }} />
          ) : items.length === 0 ? (
            <Text style={{ marginTop: 24, textAlign: 'center', color: colors.textMuted }}>{t.merchant.no_products_visitor}</Text>
          ) : (
            items.map((product) => {
              const selected = picked.some((item) => item.id === product.id);
              const full = !selected && picked.length >= MAX_LINKED_PRODUCTS;
              const cover = resolveMediaUrl(product.cover_url);
              return (
                <Pressable
                  key={product.id}
                  testID="picker.product"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected, disabled: full }}
                  disabled={full}
                  onPress={() => toggle(product)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 10, borderWidth: 2, borderColor: selected ? colors.brandCoral : 'transparent', opacity: full ? 0.5 : 1 }}
                >
                  <View style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.bgWarmDeep }}>
                    {cover ? <Image source={{ uri: cover }} style={{ width: 52, height: 52 }} contentFit="cover" /> : null}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textMain }} numberOfLines={1}>{product.name}</Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>
                      {priceLabel(t, langCode, product.price_gross_cents, product.currency)}
                    </Text>
                  </View>
                  <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={selected ? colors.brandCoral : colors.textSubtle} />
                </Pressable>
              );
            })
          )}
        </ScrollView>
    </View>
  );
}
