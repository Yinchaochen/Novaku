import * as ExpoSecureStore from 'expo-secure-store';

// Hard cap on every native SecureStore call. On iOS 26 with new arch + our
// RCTTurboModule patch, certain TurboModule paths can leave promises
// unresolved (the patched @catch suppresses the throw but the native
// resolve/reject never fires). Without this guard, a single hang here
// freezes app boot indefinitely.
const SECURE_STORE_TIMEOUT_MS = 3000;

function canUseWebStorage() {
  if (typeof window === 'undefined') return false;
  try {
    return typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`SecureStore_timeout:${label}`)), ms),
    ),
  ]);
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
    return await withTimeout(
      ExpoSecureStore.getItemAsync(key),
      SECURE_STORE_TIMEOUT_MS,
      `get:${key}`,
    );
  } catch {
    return null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (canUseWebStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }

  try {
    await withTimeout(
      ExpoSecureStore.setItemAsync(key, value),
      SECURE_STORE_TIMEOUT_MS,
      `set:${key}`,
    );
  } catch {
    // best-effort: in-memory state proceeds regardless
  }
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

  try {
    await withTimeout(
      ExpoSecureStore.deleteItemAsync(key),
      SECURE_STORE_TIMEOUT_MS,
      `delete:${key}`,
    );
  } catch {
    // best-effort
  }
}
