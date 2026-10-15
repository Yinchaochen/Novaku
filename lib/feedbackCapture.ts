import { Platform } from 'react-native';
import { captureScreen } from 'react-native-view-shot';

import { usePrivacyMaskStore } from '../store/privacyMaskStore';

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * A screenshot of Postervia's own window with people masked, as base64 JPEG.
 * Masks are switched on, two frames are allowed to paint them, the window is
 * captured, and masks are switched off again whatever happens. Null on web and
 * whenever capture fails: feedback is still sent, just without a picture.
 */
export async function captureMaskedScreen(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const { setMasking } = usePrivacyMaskStore.getState();
  setMasking(true);
  try {
    await nextFrame();
    await nextFrame();
    return await captureScreen({ format: 'jpg', quality: 0.6, result: 'base64', width: 720 });
  } catch {
    return null;
  } finally {
    setMasking(false);
  }
}
