import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// How much of the window bottom the keyboard covers, in dp. Android under
// edge-to-edge (SDK 54) does not resize the window for the IME, and a
// fullScreen Modal sits in a window of its own on top of that — so nothing
// shrinks by itself and the keyboard lands on whatever is at the bottom.
// Containers with a text field below the fold subtract this themselves.
//
// keyboardDidShow reports `imeInsets.bottom - systemBars.bottom`
// (ReactRootView.checkForKeyboardEvents, API 30+): the height above the
// navigation bar, which is right when the window was already resized to
// exclude that bar and short by exactly that bar when it was not. Our windows
// span the whole screen, so the bar goes back in. Overshooting leaves a thin
// gap above the keyboard; undershooting hides the line being typed.
//
// `enabled` exists because every mounted screen would otherwise re-render on
// every keyboard toggle, most of them to use the same 0 they already had.
export function useKeyboardHeight(enabled: boolean = true): number {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (event) =>
      setHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
      setHeight(0);
    };
  }, [enabled]);

  if (!enabled || height <= 0) return 0;
  return height + insets.bottom;
}
