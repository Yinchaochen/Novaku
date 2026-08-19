import { Text, View } from 'react-native';

import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/tokens';

// "Published by Postervia" (D-065), shown next to the author name on seeded
// cold-start content.
//
// Deliberately a word, not a second glyph. The verified badge (D-063) already
// occupies the icon slot beside a name, and two small marks side by side read
// as one decoration rather than two separate claims — which is exactly the
// confusion to avoid here, because the claims are unrelated: that badge says
// "a checked real person", this one says "not a person at all".
//
// Warm neutral rather than coral: coral is the verified badge's colour, and
// reusing it would tie the two together again through the palette after the
// shape had just pulled them apart.
export function OfficialChip({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const { t } = useLanguage();
  const small = size === 'sm';
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={t.plaza.official_account_label}
      testID="account.official-chip"
      style={{
        marginLeft: 5,
        paddingHorizontal: small ? 5 : 6,
        paddingVertical: small ? 1 : 2,
        borderRadius: 5,
        backgroundColor: colors.bgWarmDeep,
      }}
    >
      <Text
        style={{
          fontSize: small ? 9.5 : 11,
          fontWeight: '700',
          letterSpacing: 0.2,
          color: colors.textBrown,
        }}
      >
        {t.plaza.official_account_chip}
      </Text>
    </View>
  );
}

export function isOfficialAuthor(author?: { account_kind?: string } | null): boolean {
  // Defaults to false for any payload without the field — an older client
  // response, or a cached card written before the column existed, must never
  // make a real person render as official.
  return author?.account_kind === 'official';
}
