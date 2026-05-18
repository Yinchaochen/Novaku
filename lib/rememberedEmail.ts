import * as secureStore from './secureStore';

/**
 * Persistent "remember me" — stores ONLY the email address (never the
 * password) in SecureStore. Pre-fills the login form on subsequent visits
 * so the user doesn't retype their address.
 *
 * Saving the password is intentionally avoided. If the user wants
 * passwordless re-entry, that's the biometric path (lib/biometric.ts).
 */

const KEY = 'auth_remembered_email_v1';

export async function getRememberedEmail(): Promise<string | null> {
  try {
    return await secureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function setRememberedEmail(email: string): Promise<void> {
  try {
    await secureStore.setItemAsync(KEY, email);
  } catch {
    // SecureStore can fail on emulators / locked devices — silently ignore
    // since "remember me" is a convenience, not a critical path.
  }
}

export async function clearRememberedEmail(): Promise<void> {
  try {
    await secureStore.deleteItemAsync(KEY);
  } catch {
    // ignore
  }
}
