import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors } from '../theme/tokens';

const BRAND_IMAGE_WIDTH = 300;
const BRAND_IMAGE_ASPECT_RATIO = 960 / 780;

interface BrandIntroProps {
  /**
   * Build 24+ diagnostic chip: renders a label in the bottom-right corner.
   * Native splash (the iOS LaunchScreen storyboard generated from
   * `assets/splash-brand.png`) has no chip because it can't render React
   * components.
   *
   * Build 26 visual override: in addition to the chip, the brand image is
   * REPLACED with a giant "REACT MOUNTED v26" text label. This makes the
   * visual diff between native splash and React-rendered BrandIntro
   * impossible to miss — if the user sees the brand logo + tagline, that
   * IS the native splash; if they see "REACT MOUNTED v26", React is on
   * top. Strip this once boot-redirect is verified.
   */
  debugLabel?: string;
}

export function BrandIntro({ debugLabel }: BrandIntroProps = {}) {
  const { width } = useWindowDimensions();
  const imageWidth = Math.min(BRAND_IMAGE_WIDTH, width);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Text style={styles.giantText}>REACT</Text>
      <Text style={styles.giantText}>MOUNTED</Text>
      <Text style={styles.versionText}>v26 — {debugLabel ?? 'no label'}</Text>
      {/* Keep the image but hidden — preserves require resolution for the
          asset bundle so we don't accidentally drop it from the IPA. */}
      <View style={styles.hiddenImageWrap}>
        <Image
          source={require('../assets/splash-brand.png')}
          style={{
            width: imageWidth,
            height: imageWidth / BRAND_IMAGE_ASPECT_RATIO,
          }}
          contentFit="contain"
        />
      </View>
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
  giantText: {
    color: '#000',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 2,
  },
  versionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    letterSpacing: 1,
  },
  hiddenImageWrap: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  debugChip: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  debugChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
