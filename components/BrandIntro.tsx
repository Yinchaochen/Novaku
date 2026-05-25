import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors } from '../theme/tokens';

const BRAND_IMAGE_WIDTH = 300;
const BRAND_IMAGE_ASPECT_RATIO = 960 / 780;

interface BrandIntroProps {
  /**
   * Build 24 diagnostic chip (2026-05-25 IOS-LOGIN-106): renders a tiny label
   * in the bottom-right corner so we can tell at a glance whether the visible
   * coral screen is `/` (debugLabel="INDEX") or `/(auth)/welcome`
   * (debugLabel="WELCOME") or the native splash (no debugLabel, since native
   * splash renders the same brand image but cannot host this React-only chip).
   *
   * Strip this prop entirely once the boot-redirect chain is verified.
   */
  debugLabel?: string;
}

export function BrandIntro({ debugLabel }: BrandIntroProps = {}) {
  const { width } = useWindowDimensions();
  const imageWidth = Math.min(BRAND_IMAGE_WIDTH, width);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Image
        source={require('../assets/splash-brand.png')}
        style={{
          width: imageWidth,
          height: imageWidth / BRAND_IMAGE_ASPECT_RATIO,
        }}
        contentFit="contain"
      />
      {debugLabel ? (
        <View style={styles.debugChip}>
          <Text style={styles.debugChipText}>{debugLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.brandCoral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugChip: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  debugChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
