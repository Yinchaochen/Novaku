import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, Text, type TextProps, View, type ViewStyle } from 'react-native';

import { usePrivacyMaskStore } from '../store/privacyMaskStore';

export const MASK_COLOR = '#9CA3AF';

// Wrap anything that identifies a person: avatars, photos in chats, profile
// headers. While a feedback screenshot is taken it is covered by a solid block.
// New screens that show people must use this or PrivateText (see
// lib/__tests__/privacyMaskCoverage.test.ts).
export function PrivacyMask({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const masking = usePrivacyMaskStore((s) => s.masking);
  return (
    <View style={style}>
      {children}
      {masking ? (
        <View
          pointerEvents="none"
          testID="privacy-mask"
          style={[StyleSheet.absoluteFill, { backgroundColor: MASK_COLOR, borderRadius: 6 }]}
        />
      ) : null}
    </View>
  );
}

// Drop-in Text for names, messages, comments and bios. Masked, the text keeps
// its layout but is painted as a grey bar, so it also works nested inside Text.
export function PrivateText({ style, ...props }: TextProps) {
  const masking = usePrivacyMaskStore((s) => s.masking);
  return (
    <Text
      {...props}
      style={masking ? [style, { color: 'transparent', backgroundColor: MASK_COLOR }] : style}
    />
  );
}
