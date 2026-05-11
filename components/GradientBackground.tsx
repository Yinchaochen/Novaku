import { ReactNode } from 'react';
import { ViewProps } from 'react-native';

import { AppBackground } from './AppBackground';

/**
 * Backwards-compatible wrapper. Older screens import GradientBackground
 * directly — we keep the export but route everything through the new
 * AppBackground (radial wash + soft blobs).
 */
export function GradientBackground({
  children,
  style,
  ...rest
}: ViewProps & { children?: ReactNode }) {
  return (
    <AppBackground style={style} {...rest}>
      {children}
    </AppBackground>
  );
}

export default GradientBackground;
