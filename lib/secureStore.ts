type ExpoSecureStoreModule = typeof import('expo-secure-store');

// Hard cap on every native SecureStore call. On iOS 26 with new arch + our
// RCTTurboModule patch, certain TurboModule paths can leave promises
// unresolved (the patched @catch suppresses the throw but the native
// resolve/reject never fires). Without this guard, a single hang here
// freezes app boot indefinitely.
const SECURE_STORE_TIMEOUT_MS = 3000;

// Explicit keychainService is required on iOS 26 — the implicit-default
// path in expo-secure-store throws an NSException on certain keychain
// state, which our TurboModule patch then swallows and leaves the bridge
// half-initialized (manifests as a silent splash hang on A13-class chips).
// Community workaround documented in facebook/react-native#54859.
// Value must be stable across app versions or existing keys can't be read.
const KEYCHAIN_SERVICE = 'app.novaku.mobile';
const SECURE_STORE_OPTIONS = { keychainService: KEYCHAIN_SERVICE };

let expoSecureStorePromise: Promise<ExpoSecureStoreModule> | null = null;

function loadExpoSecureStore(): Promise<ExpoSecureStoreModule> {
  expoSecureStorePromise ??= import('expo-secure-store');
  return expoSecureStorePromise;
}

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
      loadExpoSecureStore().then((SecureStore) =>
        SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS),
      ),
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
      loadExpoSecureStore().then((SecureStore) =>
        SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS),
      ),
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
      loadExpoSecureStore().then((SecureStore) =>
        SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS),
      ),
      SECURE_STORE_TIMEOUT_MS,
      `delete:${key}`,
    );
  } catch {
    // best-effort
  }
}
