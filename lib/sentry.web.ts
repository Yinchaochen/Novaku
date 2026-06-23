export function initSentry() {
  // Web verification runs without native Sentry config.
}

export function reportToSentry(
  _error: unknown,
  _context?: Record<string, unknown>,
) {
  // No-op on web until Postervia ships a browser Sentry project.
}

export function addSentryBreadcrumb(
  _message: string,
  _data?: Record<string, unknown>,
) {
  // No-op on web.
}

export function captureSentryMessage(
  _message: string,
  _data?: Record<string, unknown>,
) {
  // No-op on web.
}

export const Sentry = {
  init: initSentry,
  captureException: reportToSentry,
  addBreadcrumb: addSentryBreadcrumb,
  captureMessage: captureSentryMessage,
  setTag: () => undefined,
};
