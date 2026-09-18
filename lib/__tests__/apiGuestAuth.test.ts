/**
 * A guest's 401 is not a dead session (D-151).
 *
 * Every signed-out web visitor makes requests without a token. When one of
 * them comes back 401 the client used to try a refresh, fail for want of a
 * refresh token, and report token_refresh_rotation_failed to Sentry — once per
 * request, for every visitor. The refresh path is only for requests that were
 * sent with a token, and this is how the client tells the two apart.
 */

import { hasAuthHeader } from '../api';

describe('hasAuthHeader', () => {
  it('sees a bearer token on a plain header object', () => {
    expect(hasAuthHeader({ Authorization: 'Bearer abc.def.ghi' })).toBe(true);
  });

  it('sees one through a get() accessor, which is how AxiosHeaders exposes them', () => {
    // axios is mocked wholesale in jest.setup.js, so the real AxiosHeaders
    // class is not available here; this is the shape the code relies on.
    const headers = { get: (name: string) => (name === 'Authorization' ? 'Bearer abc.def.ghi' : undefined) };
    expect(hasAuthHeader(headers)).toBe(true);
  });

  it('treats a request with no token as a guest request', () => {
    expect(hasAuthHeader({})).toBe(false);
    expect(hasAuthHeader(undefined)).toBe(false);
    expect(hasAuthHeader({ get: () => undefined })).toBe(false);
  });

  it('does not mistake an empty or foreign scheme for a session', () => {
    expect(hasAuthHeader({ Authorization: 'Bearer ' })).toBe(false);
    expect(hasAuthHeader({ Authorization: 'Basic dXNlcjpwYXNz' })).toBe(false);
  });
});
