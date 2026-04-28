import * as secureStore from './secureStore';

export const APP_LOCALE_KEY = 'app_locale';
export const DEFAULT_LOCALE = 'zh';

let currentLocale = DEFAULT_LOCALE;
let localeHydrated = false;

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
    }
  } catch {
    // Falling back to the in-memory default keeps the app usable offline.
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
