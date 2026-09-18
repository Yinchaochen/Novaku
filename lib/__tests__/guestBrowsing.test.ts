/**
 * Which routes a signed-out reader may read (D-151).
 *
 * Readable on the web, and only on the web: the wall, a post, search, an
 * author. Everything else — and every route on a phone — still asks for an
 * account first.
 */

import { isGuestBrowsable, signedOutLanding } from '../guestBrowsing';

describe('isGuestBrowsable', () => {
  it('lets a guest read the Plaza on the web', () => {
    expect(isGuestBrowsable(['(tabs)', 'plaza'], 'web')).toBe(true);
    expect(isGuestBrowsable(['plaza', 'search'], 'web')).toBe(true);
    expect(isGuestBrowsable(['p', '[id]'], 'web')).toBe(true);
    expect(isGuestBrowsable(['users', '[id]'], 'web')).toBe(true);
  });

  it('keeps every other tab behind an account', () => {
    for (const tab of ['tasks', 'social', 'buddy', 'profile']) {
      expect(isGuestBrowsable(['(tabs)', tab], 'web')).toBe(false);
    }
    expect(isGuestBrowsable(['settings', 'blocked-users'], 'web')).toBe(false);
    expect(isGuestBrowsable(['chat', '[id]'], 'web')).toBe(false);
  });

  it('changes nothing on a phone, where sign-in still comes first', () => {
    expect(isGuestBrowsable(['(tabs)', 'plaza'], 'ios')).toBe(false);
    expect(isGuestBrowsable(['p', '[id]'], 'android')).toBe(false);
  });

  it('does not open the root on its own', () => {
    expect(isGuestBrowsable([], 'web')).toBe(false);
  });
});

describe('signedOutLanding', () => {
  it('sends a web visitor to the wall and a phone to sign-in', () => {
    expect(signedOutLanding('web')).toBe('/plaza');
    expect(signedOutLanding('ios')).toBe('/login');
    expect(signedOutLanding('android')).toBe('/login');
  });
});
