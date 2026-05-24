import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
let initialized = false;

// P3.8 release health: tag every event with the app version + build number
// from EAS-injected expo-constants. Lets Sentry compute crash-free-sessions
// per release and surface regressions immediately after a deploy.
function _resolveRelease(): string {
  const cfg = Constants.expoConfig as
    | {
        version?: string;
        ios?: { buildNumber?: string };
        android?: { versionCode?: number };
      }
    | null
    | undefined;
  const version = cfg?.version ?? '0.0.0';
  return `postervia-ios@${version}`;
}

function _resolveDist(): string {
  const cfg = Constants.expoConfig as
    | { ios?: { buildNumber?: string }; android?: { versionCode?: number } }
    | null
    | undefined;
  const ios = cfg?.ios?.buildNumber;
  const android = cfg?.android?.versionCode;
  return String(ios ?? android ?? 'unknown');
}

// P3.10 beforeSend noise filter: drop predictable user-state errors that
// would otherwise burn quota at 1k DAU. AxiosError statuses are read from
// the original_exception.response.status that the Sentry React Native SDK
// places at event.extra (we set it via reportToSentry). The exception
// `type`/`value` strings catch native/JS error names regardless of SDK
// wrapping.
function _beforeSend(
  event: Sentry.ErrorEvent,
  hint: { originalException?: unknown },
): Sentry.ErrorEvent | null {
  // Drop user-initiated OAuth cancellation
  const errAny = (hint.originalException as { code?: string } | undefined);
  if (errAny?.code === 'ERR_REQUEST_CANCELED') return null;

  // Drop axios validation errors (422 should already be filtered at the
  // interceptor, but defense-in-depth in case some code path reports directly)
  const extras = event.extra as { status?: number | string } | undefined;
  if (extras?.status === 422) return null;

  // Drop client-side abort errors (TanStack Query rapid mount/unmount,
  // React Native Image canceled, etc.) — these are user navigation, not bugs.
  const exception = event.exception?.values?.[0];
  if (exception?.value?.includes('canceled') || exception?.value?.includes('aborted')) {
    return null;
  }

  return event;
}

export function initSentry() {
  if (initialized) return;
  if (!DSN) {
    // Rule 1 (RETROSPECTIVES.md 2026-05-24): loud-fail on missing config, never silent
    // eslint-disable-next-line no-console
    console.error('[FATAL] EXPO_PUBLIC_SENTRY_DSN missing — Sentry disabled');
    return;
  }

  Sentry.init({
    dsn: DSN,
    debug: __DEV__,
    enabled: !__DEV__,
    enableNative: !__DEV__,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    release: _resolveRelease(),
    dist: _resolveDist(),
    beforeSend: _beforeSend,
  });

  initialized = true;

  // Rule 1 self-test: emit one event the moment init completes, with DSN tail
  // baked into the message so the Sentry dashboard project ID can be verified
  // at a glance ("does the tail match the project I expect events in?").
  try {
    Sentry.captureMessage(`sentry:initialized:dsn_tail=${DSN.slice(-20)}`, 'info');
  } catch {
    // best-effort; never let the self-test crash the app
  }
}

export function reportToSentry(
  error: unknown,
  context?: Record<string, unknown>,
) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error('[reportToSentry]', error, context);
  }
  if (!initialized) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // never let the reporter itself crash the app
  }
}

export function addSentryBreadcrumb(message: string, data?: Record<string, unknown>) {
  if (!initialized) return;
  try {
    Sentry.addBreadcrumb({ message, data, level: 'info' });
  } catch {
    // best-effort
  }
}

export { Sentry };
