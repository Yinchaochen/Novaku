import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { ShopChip } from './ShopChip';
import { ShopStatusLine } from './ShopPanes';
import { useLanguage } from '../../context/LanguageContext';
import type { Merchant } from '../../features/merchants/types';
import { resolveMediaUrl } from '../../lib/media';
import { colors } from '../../theme/tokens';

// What a customer sees first on a shop's page: the name once, whether it is open now,
// the street, and the way there. A person's ID, QR and follower counts are left out on purpose.
export function ShopPublicHeader({
  shop,
  following,
  onToggleFollow,
  onDirections,
}: {
  shop: Merchant;
  following: boolean;
  onToggleFollow: () => void;
  onDirections: () => void;
}) {
  const { t } = useLanguage();
  const avatar = resolveMediaUrl(shop.avatar_url);
  return (
    <View testID="shop.public-header" style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden', backgroundColor: '#FFE4E6', alignItems: 'center', justifyContent: 'center' }}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={{ width: 64, height: 64 }} contentFit="cover" />
          ) : (
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.brandCoral }}>{shop.place_name.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flexShrink: 1, fontSize: 22, fontWeight: '900', color: colors.textMain }} numberOfLines={2}>
              {shop.place_name}
            </Text>
            <ShopChip size="md" />
          </View>
          <ShopStatusLine shop={shop} color={colors.textBrown} />
        </View>
      </View>
      {shop.address ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="location-outline" size={16} color={colors.textMuted} />
          <Text style={{ flex: 1, fontSize: 14, color: colors.textBrown }} numberOfLines={2}>
            {shop.address}
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          testID="shop.directions"
          accessibilityRole="button"
          onPress={onDirections}
          style={{ flex: 1, minHeight: 46, borderRadius: 999, backgroundColor: colors.brandCoral, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Ionicons name="navigate-outline" size={16} color="#FFFFFF" />
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>{t.merchant.directions}</Text>
        </Pressable>
        <Pressable
          testID="shop.follow"
          accessibilityRole="button"
          accessibilityState={{ selected: following }}
          onPress={onToggleFollow}
          style={{ flex: 1, minHeight: 46, borderRadius: 999, borderWidth: 1.5, borderColor: following ? '#E8E0DA' : '#FBC5B5', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: following ? colors.textMuted : '#E9605A' }}>
            {following ? t.profile.following_button : t.profile.follow_button}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
