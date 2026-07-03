// Runs before any module import (jest setupFiles). lib/env.ts zod-validates
// EXPO_PUBLIC_* at import time and throws on missing vars — tests don't load
// .env, so provide well-formed fakes here. Keep values obviously fake so a
// test that accidentally hits the network fails loudly.
process.env.EXPO_PUBLIC_API_URL = 'https://api.test.invalid/v1';
process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://fake@fake.ingest.test.invalid/1';

// axios's fetch adapter feature-probes at import time (creates a test
// ReadableStream and cancels it), which hard-crashes the jest worker under
// jest-expo's winter/streams polyfill ("Cannot cancel a stream that already
// has a reader"). Unit tests must never do real HTTP anyway, so mock the
// package once here: enough surface for `import { AxiosError }` (authStore)
// and `axios.create()` (lib/api) to load without touching adapters.
jest.mock('axios', () => {
  class AxiosError extends Error {
    constructor(message) {
      super(message);
      this.isAxiosError = true;
    }
  }
  const stubInstance = () => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: { headers: {} },
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  });
  const axios = Object.assign(stubInstance(), {
    create: jest.fn(stubInstance),
    isAxiosError: (e) => Boolean(e && e.isAxiosError),
    AxiosError,
  });
  return { __esModule: true, default: axios, AxiosError, isAxiosError: axios.isAxiosError };
});
