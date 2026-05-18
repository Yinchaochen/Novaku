import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    debug: __DEV__,
    enabled: !__DEV__,
    enableNative: !__DEV__,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });

  initialized = true;
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
