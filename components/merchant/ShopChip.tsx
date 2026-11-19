import { Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../theme/tokens';

// A shop's byline (D-159 / D-195): the same warm neutral word chip as OfficialChip,
// because both say what kind of account this is, not that anyone was verified.
export function ShopChip({ size = 'sm', inverse = false }: { size?: 'sm' | 'md'; inverse?: boolean }) {
  const { t } = useLanguage();
  const small = size === 'sm';
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={t.merchant.chip_label}
      testID="account.shop-chip"
      style={{
        marginLeft: 5,
        paddingHorizontal: small ? 5 : 7,
        paddingVertical: small ? 1 : 2,
        borderRadius: 5,
        backgroundColor: inverse ? '#FFFFFF' : colors.bgWarmDeep,
      }}
    >
      <Text style={{ fontSize: small ? 10 : 11, fontWeight: '700', color: colors.textBrown }}>{t.merchant.chip}</Text>
    </View>
  );
}
