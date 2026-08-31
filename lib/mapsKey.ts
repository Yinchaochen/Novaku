import { Platform } from 'react-native';

/**
 * Which Google Maps key this platform should use (SEC-APP-MAPSKEY-01).
 *
 * One key serves iOS, Android and Web today, and that is precisely why it
 * cannot be restricted: a Websites restriction blocks the two native
 * platforms (their requests carry no Referer), an Android restriction blocks
 * web and iOS, and so on. So the key sits on the public internet — baked into
 * the web bundle and both app binaries — with no application restriction at
 * all, and only its API list and daily quota bound the damage.
 *
 * The fix is one key per platform, each restricted to that platform. This
 * resolver is the code half. It falls back to the shared key whenever a
 * platform-specific one is absent, so the change ships before the keys exist
 * and each platform switches over the moment its own key is configured —
 * no flag day, no window where maps are broken.
 */

export interface MapsKeyEnv {
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_WEB?: string;
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS?: string;
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID?: string;
}

function clean(value: string | undefined): string | undefined {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Pure resolver — `platform` is passed in so this is testable off-device. */
export function resolveMapsKey(env: MapsKeyEnv, platform: string): string {
  const perPlatform =
    platform === 'ios'
      ? env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS
      : platform === 'android'
        ? env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID
        : env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_WEB;
  return clean(perPlatform) ?? clean(env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) ?? '';
}

/** True once this platform is on its own restricted key rather than the shared one. */
export function isPlatformScopedKey(env: MapsKeyEnv, platform: string): boolean {
  const perPlatform =
    platform === 'ios'
      ? env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS
      : platform === 'android'
        ? env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID
        : env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_WEB;
  return clean(perPlatform) !== undefined;
}

export function mapsApiKey(): string {
  return resolveMapsKey(process.env as MapsKeyEnv, Platform.OS);
}
