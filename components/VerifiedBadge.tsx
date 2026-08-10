import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/tokens';

// Account badge (D-063), drawn from the brand mark rather than a stock glyph:
// the narrow arch of the app icon with its star inside — the gate you walk
// through and the light left for whoever comes next.
//
// The star carries no built-in "verified" meaning the way a checkmark does
// (lisum chose this shape knowing that), so the accessibility label is the
// only thing that states what the badge claims. It says "Verified account",
// never a bare "Verified": the app already uses that word for a source whose
// freshness was re-checked, and a screen reader announcing it next to a name
// would merge two unrelated claims.
//
// Filled shapes, not strokes: at the 12px used on feed cards a 2.6px outline
// muddies on low-density Android screens, while a solid silhouette holds.
const GATE = 'M6 22 L6 10 A6 6 0 0 1 18 10 L18 22 Z';
const STAR = 'M12 8.4l1.5 3.3 3.3 1.5 -3.3 1.5 -1.5 3.3 -1.5 -3.3 -3.3 -1.5 3.3 -1.5 Z';

export function VerifiedBadge({ size = 14 }: { size?: number }) {
  const { t } = useLanguage();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t.profile.verified_badge_label}
      testID="account.verified-badge"
      style={{ marginLeft: 4, justifyContent: 'center' }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={GATE} fill={colors.badgeVerified} />
        <Path d={STAR} fill="#FFFFFF" />
      </Svg>
    </View>
  );
}
