import { useMemo, useState } from 'react';
import type { GestureResponderEvent, PressableProps } from 'react-native';

type PressHandlers = Pick<PressableProps, 'onPressIn' | 'onPressOut'>;

/**
 * Press feedback without Pressable's callback-style prop.
 *
 * nativewind v4's css-interop drops `style={({ pressed }) => ...}` output on
 * native (upstream nativewind#1105/#1781; docs/MOBILE_PLATFORM_GOTCHAS.md
 * 坑 #7), so `style` must stay a plain static value. This hook tracks the
 * pressed state via onPressIn/onPressOut instead:
 *
 *   const [pressed, pressHandlers] = usePressedFeedback({ onPressIn, onPressOut });
 *   <Pressable {...pressHandlers} style={[styles.base, pressed ? styles.pressed : null]}>
 *
 * Pass the caller's own onPressIn/onPressOut so they keep firing.
 */
export function usePressedFeedback({ onPressIn, onPressOut }: PressHandlers = {}) {
  const [pressed, setPressed] = useState(false);
  const handlers = useMemo(
    () => ({
      onPressIn: (event: GestureResponderEvent) => {
        setPressed(true);
        onPressIn?.(event);
      },
      onPressOut: (event: GestureResponderEvent) => {
        setPressed(false);
        onPressOut?.(event);
      },
    }),
    [onPressIn, onPressOut],
  );
  return [pressed, handlers] as const;
}
