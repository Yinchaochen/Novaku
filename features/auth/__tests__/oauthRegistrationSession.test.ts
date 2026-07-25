import {
  clearOAuthRegistrationSession,
  getOAuthRegistrationSession,
  setOAuthRegistrationSession,
} from '../oauthRegistrationSession';

describe('OAuth registration session', () => {
  afterEach(() => clearOAuthRegistrationSession());

  it('keeps the short-lived ticket in memory for the legal confirmation screen', () => {
    setOAuthRegistrationSession({
      registrationTicket: 'signed-ticket',
      profile: {
        provider: 'google',
        email: 'hello@example.com',
        displayName: 'Hello',
        avatarUrl: 'https://lh3.googleusercontent.com/avatar',
      },
    });

    expect(getOAuthRegistrationSession()?.profile.provider).toBe('google');
    expect(getOAuthRegistrationSession()?.registrationTicket).toBe('signed-ticket');
  });

  it('clears all provider data after completion or cancellation', () => {
    setOAuthRegistrationSession({
      registrationTicket: 'signed-ticket',
      profile: {
        provider: 'apple',
        email: 'relay@privaterelay.appleid.com',
        displayName: 'Apple User',
        avatarUrl: null,
      },
    });

    clearOAuthRegistrationSession();

    expect(getOAuthRegistrationSession()).toBeNull();
  });
});
