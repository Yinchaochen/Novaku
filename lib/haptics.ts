import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Cross-platform haptic helper. iOS-only by default — Android's haptic
 * patterns are inconsistent across manufacturers and easily feel cheap.
 * iOS Taptic Engine is the only place where a button press can feel
 * genuinely premium without tuning per device.
 *
 * Usage:
 *   import { tap } from '../lib/haptics';
 *   <Pressable onPress={() => { tap('light'); doThing(); }} />
 */
type Style = 'selection' | 'light' | 'medium' | 'success';

export function tap(style: Style = 'light') {
  if (Platform.OS !== 'ios') return;
  switch (style) {
    case 'selection':
      void Haptics.selectionAsync();
      return;
    case 'light':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    case 'medium':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    case 'success':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
  }
}
