import * as Localization from 'expo-localization';

import allTranslations from '../locales/all_translations';
import * as secureStore from './secureStore';

export const APP_LOCALE_KEY = 'app_locale';
// English is the international fallback for users whose system language we
// don't translate. Most importantly: this is what an App Store reviewer's
// default-English iPhone sees, which is the gate Postervia has to pass.
export const DEFAULT_LOCALE = 'en';

// Hand-maintained (zh/en/de) + 103 auto-generated long-tail codes.
// Auto-generated codes are simple ISO 639-1 (two-letter), no region/script.
const SUPPORTED_LOCALES = new Set<string>([
  'en',
  'zh',
  'de',
  ...Object.keys(allTranslations),
]);

let currentLocale = DEFAULT_LOCALE;
let localeHydrated = false;

/**
 * Walk the user's iOS/Android language preferences (priority-ordered) and
 * return the first language code we support. Skips Traditional Chinese —
 * we only ship Simplified, and showing zh-Hant users Simplified Chinese is
 * a worse experience than showing them English (industry consensus).
 */
function detectSystemLocale(): string {
  try {
    const locales = Localization.getLocales();
    for (const loc of locales) {
      if (loc.languageScriptCode === 'Hant') continue;
      const code = loc.languageCode;
      if (code && SUPPORTED_LOCALES.has(code)) {
        return code;
      }
    }
  } catch {
    // expo-localization should never throw; defensive only.
  }
  return DEFAULT_LOCALE;
}

export function getCurrentLocale() {
  return currentLocale;
}

export function setCurrentLocale(locale: string) {
  currentLocale = locale || DEFAULT_LOCALE;
  localeHydrated = true;
}

export async function hydrateCurrentLocale() {
  if (localeHydrated) {
    return currentLocale;
  }

  try {
    const savedLocale = await secureStore.getItemAsync(APP_LOCALE_KEY);
    if (savedLocale) {
      currentLocale = savedLocale;
    } else {
      // First launch, or user has never chosen a language. Detect from the
      // OS instead of forcing English. Detection runs every cold-start so
      // that a user who changes their system language sees the app follow.
      currentLocale = detectSystemLocale();
    }
  } catch {
    currentLocale = detectSystemLocale();
  } finally {
    localeHydrated = true;
  }

  return currentLocale;
}

export async function persistCurrentLocale(locale: string) {
  setCurrentLocale(locale);

  try {
    await secureStore.setItemAsync(APP_LOCALE_KEY, locale);
  } catch {
    // Keep the in-memory locale even if persistence fails.
  }
}
