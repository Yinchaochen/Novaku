// queryClient.ts wires the AsyncStorage persister and NetInfo at import time;
// neither exists under jest, so they are stubbed the same way the chat-send
// test stubs them. The functions under test touch neither.
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../sentry', () => ({
  addSentryBreadcrumb: jest.fn(),
  reportToSentry: jest.fn(),
}));

import { errorStatus, retryReads } from '../queryClient';

// A deploy switchover fails requests for some tens of seconds. These pin the
// policy that lets the feed outlast it without ever retrying a real answer.

const http = (status: number) => ({ response: { status } });
const network = new Error('Network Error');

describe('errorStatus', () => {
  it('reads the status off an axios-shaped error', () => {
    expect(errorStatus(http(503))).toBe(503);
  });

  it('is undefined for a network failure', () => {
    expect(errorStatus(network)).toBeUndefined();
  });
});

describe('retryReads', () => {
  it('never retries a 4xx — that is an answer, not a blip', () => {
    const retry = retryReads(4);
    expect(retry(0, http(401))).toBe(false);
    expect(retry(0, http(404))).toBe(false);
    expect(retry(0, http(422))).toBe(false);
  });

  it('retries a 5xx up to the cap', () => {
    const retry = retryReads(4);
    expect(retry(0, http(502))).toBe(true);
    expect(retry(3, http(502))).toBe(true);
    expect(retry(4, http(502))).toBe(false);
  });

  it('retries a network failure up to the cap', () => {
    const retry = retryReads(2);
    expect(retry(0, network)).toBe(true);
    expect(retry(1, network)).toBe(true);
    expect(retry(2, network)).toBe(false);
  });

  it('the default policy is a single retry', () => {
    const retry = retryReads(1);
    expect(retry(0, http(500))).toBe(true);
    expect(retry(1, http(500))).toBe(false);
  });
});
