import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors } from '../theme/tokens';

const BRAND_IMAGE_WIDTH = 300;
const BRAND_IMAGE_ASPECT_RATIO = 960 / 780;

export function BrandIntro() {
  const { width } = useWindowDimensions();
  const hideRequestedRef = useRef(false);
  const imageWidth = Math.min(BRAND_IMAGE_WIDTH, width);

  const handleLayout = useCallback(() => {
    if (hideRequestedRef.current) return;
    hideRequestedRef.current = true;
    requestAnimationFrame(() => {
      try {
        SplashScreen.hide();
      } catch {
        // Default autohide may already have removed it.
      }
    });
  }, []);

  return (
    <View style={styles.screen} onLayout={handleLayout}>
      <StatusBar style="light" />
      <Image
        source={require('../assets/splash-brand.png')}
        style={{
          width: imageWidth,
          height: imageWidth / BRAND_IMAGE_ASPECT_RATIO,
        }}
        contentFit="contain"
      />
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
});
