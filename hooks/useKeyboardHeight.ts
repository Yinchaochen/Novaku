import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// Android under edge-to-edge (SDK 54) does not resize the window for the IME,
// and a fullScreen Modal sits in a window of its own on top of that — so
// nothing shrinks by itself and the keyboard lands on whatever is at the
// bottom. Screens with a text field below the fold subtract this themselves.
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (event) =>
      setHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
