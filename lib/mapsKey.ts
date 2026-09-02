import { Platform } from 'react-native';

/**
 * Which Google Maps key this platform should use (SEC-APP-MAPSKEY-01).
 *
 * One key serves iOS, Android and Web today, and it carries no application
 * restriction at all — only its API list and daily quota bound the damage.
 *
 * Until D-107 that was unavoidable: the location picker called Places over
 * REST from this same key, and React Native's fetch sends none of the headers
 * an application restriction checks against (no Referer for a Websites rule,
 * no X-Android-Package / X-Android-Cert for an Android one), so any
 * restriction that protected the key also broke the picker. Places now runs
 * on the backend, and nothing in this bundle calls a Maps HTTP API any more:
 * the key is read at build time to configure the native Maps SDKs, and that
 * is all. Native SDK requests DO carry the package/signature and bundle-id
 * proofs — so each platform's key can now be locked to its own app.
 *
 * The remaining work is one key per platform, each restricted to that
 * platform. This resolver is the code half. It falls back to the shared key
 * whenever a platform-specific one is absent, so each platform switches over
 * the moment its own key is configured — no flag day, no window where maps
 * are broken.
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
