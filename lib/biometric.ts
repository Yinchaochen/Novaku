import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

/**
 * Biometric (Face ID / Fingerprint / iris) login helpers.
 *
 * v1 model — biometric is a *gate* on top of the existing JWT auth, not a
 * replacement for it:
 *
 *   1. User logs in normally with email + password (any auth method).
 *   2. Auth flow stores the JWT in SecureStore (existing behaviour).
 *   3. We separately set `auth_biometric_enabled = '1'` once the user opts
 *      into biometric on first successful login.
 *   4. On the login screen, if biometric is available + enabled, we show a
 *      "Login with Fingerprint" button. Tapping it triggers the system
 *      biometric prompt and, on success, recalls the remembered email and
 *      lets the user submit faster (or auto-submits if the JWT is still
 *      valid — handled by the auth-store hydrate path).
 *
 * Storing the password is deliberately avoided.
 */

const ENABLED_KEY = 'auth_biometric_enabled_v1';

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return isEnrolled;
  } catch {
    return false;
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const flag = await SecureStore.getItemAsync(ENABLED_KEY);
    return flag === '1';
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(on: boolean): Promise<void> {
  try {
    if (on) {
      await SecureStore.setItemAsync(ENABLED_KEY, '1');
    } else {
      await SecureStore.deleteItemAsync(ENABLED_KEY);
    }
  } catch {
    // ignore
  }
}

interface PromptResult {
  success: boolean;
  cancelled: boolean;
}

export async function promptBiometric(promptMessage: string): Promise<PromptResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    if (result.success) return { success: true, cancelled: false };
    const cancelled =
      'error' in result &&
      (result.error === 'user_cancel' || result.error === 'system_cancel' || result.error === 'app_cancel');
    return { success: false, cancelled };
  } catch {
    return { success: false, cancelled: true };
  }
}
