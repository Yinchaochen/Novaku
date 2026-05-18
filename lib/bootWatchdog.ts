import * as secureStore from './secureStore';
import { addSentryBreadcrumb, reportToSentry } from './sentry';

const BOOT_FAIL_KEY = 'boot_failures';
const BOOT_LAST_SUCCESS_KEY = 'boot_last_success';
const SAFE_MODE_THRESHOLD = 2;
const BOOT_TIMEOUT_MS = 8000;

let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
let bootMarked = false;

interface BootState {
  failureCount: number;
  shouldEnterSafeMode: boolean;
}

export async function loadBootState(): Promise<BootState> {
  try {
    const raw = await secureStore.getItemAsync(BOOT_FAIL_KEY);
    const failureCount = raw ? parseInt(raw, 10) || 0 : 0;
    return {
      failureCount,
      shouldEnterSafeMode: failureCount >= SAFE_MODE_THRESHOLD,
    };
  } catch {
    return { failureCount: 0, shouldEnterSafeMode: false };
  }
}

export async function startBootWatchdog(): Promise<void> {
  const { failureCount } = await loadBootState();
  const nextCount = failureCount + 1;
  try {
    await secureStore.setItemAsync(BOOT_FAIL_KEY, String(nextCount));
  } catch {
    // SecureStore failures must not block the app
  }
  addSentryBreadcrumb('boot_watchdog_started', { failureCount: nextCount });

  if (watchdogTimer) clearTimeout(watchdogTimer);
  watchdogTimer = setTimeout(() => {
    if (bootMarked) return;
    reportToSentry(new Error('BootWatchdogTimeout'), {
      timeoutMs: BOOT_TIMEOUT_MS,
      failureCount: nextCount,
    });
  }, BOOT_TIMEOUT_MS);
}

export async function markBootSuccess(): Promise<void> {
  if (bootMarked) return;
  bootMarked = true;
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
  try {
    await secureStore.setItemAsync(BOOT_FAIL_KEY, '0');
    await secureStore.setItemAsync(BOOT_LAST_SUCCESS_KEY, String(Date.now()));
  } catch {
    // best-effort
  }
  addSentryBreadcrumb('boot_watchdog_success');
}

export async function resetBootCounter(): Promise<void> {
  bootMarked = false;
  try {
    await secureStore.setItemAsync(BOOT_FAIL_KEY, '0');
  } catch {
    // best-effort
  }
}
