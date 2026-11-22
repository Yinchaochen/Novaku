import { Platform } from 'react-native';

// expo-image-picker reports a picked video's length in milliseconds on iOS and
// Android, but in seconds on web, where it reads HTMLVideoElement.duration.
export function pickedVideoDurationMs(duration: number | null | undefined, os: string = Platform.OS): number {
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  return Math.round(os === 'web' ? duration * 1000 : duration);
}

/** Whole seconds for the upload API, which rejects 0 (`duration_seconds >= 1`). */
export function videoDurationSeconds(durationMs: number): number {
  return durationMs > 0 ? Math.max(1, Math.round(durationMs / 1000)) : 0;
}
