import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { priceLabel } from './ShopPanes';
import { useLanguage } from '../../context/LanguageContext';
import type { ProductCard } from '../../features/merchants/types';
import { resolveMediaUrl } from '../../lib/media';
import { colors } from '../../theme/tokens';

function Thumb({ url }: { url: string | null }) {
  const cover = resolveMediaUrl(url);
  return (
    <View style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.bgWarmDeep }}>
      {cover ? <Image source={{ uri: cover }} style={{ width: 52, height: 52 }} contentFit="cover" /> : null}
    </View>
  );
}

/** Products on a post: tap opens the product page; with onRemove they are the composer's chips. */
export function PostProductCards({
  products,
  onRemove,
  title,
}: {
  products: ProductCard[];
  onRemove?: (id: string) => void;
  title?: string;
}) {
  const { t, langCode } = useLanguage();
  if (products.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      {title ? <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted }}>{title}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {products.map((product) => (
          <Pressable
            key={product.id}
            testID="post.product-card"
            accessibilityRole="button"
            accessibilityLabel={product.name}
            onPress={() => (onRemove ? undefined : router.push(`/products/${product.id}`))}
            style={{ width: 210, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECE4DE', borderRadius: 18, padding: 8 }}
          >
            <Thumb url={product.cover_url} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMain }} numberOfLines={1}>{product.name}</Text>
              <Text style={{ fontSize: 13, fontWeight: product.price_gross_cents === null ? '400' : '800', color: product.price_gross_cents === null ? colors.textMuted : colors.textMain }}>
                {priceLabel(t, langCode, product.price_gross_cents, product.currency)}
              </Text>
            </View>
            {onRemove ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.merchant.remove_product}
                onPress={() => onRemove(product.id)}
                hitSlop={8}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3ECE6', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={14} color="#7A6A60" />
              </Pressable>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
