import * as ExpoSecureStore from 'expo-secure-store';

function canUseWebStorage() {
  if (typeof window === 'undefined') return false;
  try {
    return typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (canUseWebStorage()) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
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
    window.localStorage.setItem(key, value);
    return;
  }

  await ExpoSecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (canUseWebStorage()) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // best-effort delete
    }
    return;
  }

  await ExpoSecureStore.deleteItemAsync(key);
}
