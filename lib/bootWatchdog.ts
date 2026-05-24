import * as secureStore from './secureStore';
import { addSentryBreadcrumb, reportToSentry } from './sentry';

const BOOT_FAIL_KEY = 'boot_failures';
const BOOT_LAST_SUCCESS_KEY = 'boot_last_success';
const SAFE_MODE_THRESHOLD = 2;
const BOOT_TIMEOUT_MS = 8000;

// P2.7 dedupe: report each persistence-failure source at most once per session.
const _bootWatchdogReported = new Set<string>();
function _reportBootWatchdog(source: string, err: unknown): void {
  addSentryBreadcrumb('bootWatchdog.failure', { source });
  if (_bootWatchdogReported.has(source)) return;
  _bootWatchdogReported.add(source);
  reportToSentry(err, { source: `bootWatchdog.${source}` });
}

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
  } catch (err) {
    _reportBootWatchdog('loadBootState', err);
    return { failureCount: 0, shouldEnterSafeMode: false };
  }
}

/**
 * Arms the boot watchdog timer FIRST, then attempts to persist the boot
 * counter. Earlier versions did the writes first, which meant a hung
 * SecureStore call (the iOS 26 + new arch failure mode we're chasing)
 * would prevent the timer from ever arming and we'd get zero Sentry
 * signal. Now even total SecureStore failure still emits a timeout event.
 */
export async function startBootWatchdog(failureCount: number): Promise<void> {
  if (bootMarked) return;
  if (watchdogTimer) clearTimeout(watchdogTimer);
  watchdogTimer = setTimeout(() => {
    if (bootMarked) return;
    reportToSentry(new Error('BootWatchdogTimeout'), {
      timeoutMs: BOOT_TIMEOUT_MS,
      failureCount,
    });
  }, BOOT_TIMEOUT_MS);
  addSentryBreadcrumb('boot_watchdog_armed', { failureCount });

  const nextCount = failureCount + 1;
  try {
    await secureStore.setItemAsync(BOOT_FAIL_KEY, String(nextCount));
  } catch (err) {
    // SecureStore failures must not block the app. The watchdog is already
    // armed above so we still get a Sentry signal if boot hangs.
    _reportBootWatchdog('startBootWatchdog.setItem', err);
  }
  addSentryBreadcrumb('boot_counter_incremented', { failureCount: nextCount });
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
  } catch (err) {
    _reportBootWatchdog('markBootSuccess', err);
  }
  addSentryBreadcrumb('boot_watchdog_success');
}

export async function resetBootCounter(): Promise<void> {
  bootMarked = false;
  try {
    await secureStore.setItemAsync(BOOT_FAIL_KEY, '0');
  } catch (err) {
    _reportBootWatchdog('resetBootCounter', err);
  }
}
