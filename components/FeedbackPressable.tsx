import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

import { usePressedFeedback } from '../hooks/usePressedFeedback';

export interface FeedbackPressableProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: PressableProps['children'];
  /** Resting styles — attached statically so native never loses them (GOTCHAS 坑 #7). */
  style?: StyleProp<ViewStyle>;
  /** Merged on top of `style` while pressed (and not disabled). */
  pressedStyle?: StyleProp<ViewStyle>;
}

/**
 * Drop-in Pressable for press feedback without the callback-style prop, which
 * nativewind v4's css-interop drops on native (nativewind#1105/#1781).
 * Use this instead of `style={({ pressed }) => ...}` — especially inside
 * `.map()` rows where `usePressedFeedback` can't be called directly.
 */
export function FeedbackPressable({
  style,
  pressedStyle,
  disabled,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: FeedbackPressableProps) {
  const [pressed, pressHandlers] = usePressedFeedback({ onPressIn, onPressOut });
  return (
    <Pressable
      disabled={disabled}
      {...pressHandlers}
      style={[style, pressed && !disabled ? pressedStyle : null]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
