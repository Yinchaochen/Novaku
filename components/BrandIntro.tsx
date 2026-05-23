import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors } from '../theme/tokens';

const BRAND_IMAGE_WIDTH = 300;
const BRAND_IMAGE_ASPECT_RATIO = 960 / 780;

export function BrandIntro() {
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
