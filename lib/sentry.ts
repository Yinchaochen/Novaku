import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
let initialized = false;

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
