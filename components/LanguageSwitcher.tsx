import * as secureStore from '../lib/secureStore';

const LANG_KEY = 'app_locale';

export async function loadSavedLocale(): Promise<string | null> {
  try {
    return await secureStore.getItemAsync(LANG_KEY);
  } catch {
    return null;
  }
}

export async function saveLocale(lang: string): Promise<void> {
  try {
    await secureStore.setItemAsync(LANG_KEY, lang);
  } catch {}
}
