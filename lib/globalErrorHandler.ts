import { reportToSentry } from './sentry';

let installed = false;

interface ErrorUtilsLike {
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
  getGlobalHandler: () => ((error: Error, isFatal?: boolean) => void) | undefined;
}

export function installGlobalErrorHandler() {
  if (installed) return;
  installed = true;

  const ErrorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!ErrorUtils?.setGlobalHandler) return;

  const previous = ErrorUtils.getGlobalHandler?.();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    reportToSentry(error, { isFatal: Boolean(isFatal), source: 'globalHandler' });
    if (previous) {
      try {
        previous(error, isFatal);
      } catch {
        // never let the chained handler kill us
      }
    }
  });

  const onUnhandledRejection = (event: { reason?: unknown }) => {
    reportToSentry(event.reason ?? new Error('UnhandledPromiseRejection'), {
      source: 'unhandledRejection',
    });
  };
  const g = globalThis as unknown as {
    addEventListener?: (type: string, listener: (event: { reason?: unknown }) => void) => void;
  };
  g.addEventListener?.('unhandledrejection', onUnhandledRejection);
}
