import * as ExpoSecureStore from 'expo-secure-store';

const webFallbackStore = new Map<string, string>();

function canUseWebStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (canUseWebStorage()) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return webFallbackStore.get(key) ?? null;
    }
  }

  try {
    return await ExpoSecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (canUseWebStorage()) {
    try {
      window.localStorage.setItem(key, value);
      return;
    } catch {
      webFallbackStore.set(key, value);
      return;
    }
  }

  await ExpoSecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (canUseWebStorage()) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      webFallbackStore.delete(key);
    }
    return;
  }

  await ExpoSecureStore.deleteItemAsync(key);
}
