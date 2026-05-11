import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

/**
 * Postervia ambient background — YumQuick-flavour solid cream.
 *
 * 2026-05-09 simplification: stripped the SVG radial-gradient blobs and the
 * 1px white interior border. They were the root cause of every "white block /
 * white edge inside the card" report — semi-transparent gradients on a warm
 * cream backdrop blur the boundary between card and page, and on Android the
 * SVG layer + LinearGradient + overflow:hidden combo doesn't always clip
 * cleanly.
 *
 * Now: solid `#FFFAF2` base + a faint top→bottom warm fade. Cards sit on it
 * as crisp white rectangles (à la YumQuick), no ambiguity about where the
 * card ends and the page begins.
 *
 * `pointerEvents="none"` on overlays — backgrounds never eat clicks.
 */

type Variant = 'default' | 'splash' | 'auth';

interface Props extends Omit<ViewProps, 'children'> {
  children?: ReactNode;
  variant?: Variant;
}

export function AppBackground({ children, style, variant = 'default', ...rest }: Props) {
  const baseColors: readonly [string, string] =
    variant === 'splash'
      ? ['#FBEFD9', '#F5E1C5']
      : ['#FFFAF2', '#FBEDDF'];

  return (
    <View style={[{ flex: 1, backgroundColor: '#FFFAF2' }, style]} {...rest}>
      <LinearGradient
        colors={baseColors as unknown as [string, string]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

export default AppBackground;
