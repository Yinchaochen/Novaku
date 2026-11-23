import { consentGranted } from '../consents';

const row = (consent_type: string, granted: boolean, revoked_at: string | null = null) => ({
  consent_type,
  granted,
  revoked_at,
});

describe('consentGranted', () => {
  it('is false when the person was never asked', () => {
    expect(consentGranted(undefined, 'cookies_analytics')).toBe(false);
    expect(consentGranted([row('marketing_email', true)], 'cookies_analytics')).toBe(false);
  });

  it('follows the newest record', () => {
    expect(consentGranted([row('cookies_analytics', true)], 'cookies_analytics')).toBe(true);
    expect(
      consentGranted([row('cookies_analytics', false), row('cookies_analytics', true)], 'cookies_analytics'),
    ).toBe(false);
  });

  it('treats a withdrawn consent as off even though granted stays true', () => {
    expect(
      consentGranted([row('cookies_analytics', true, '2026-11-23T12:00:00Z')], 'cookies_analytics'),
    ).toBe(false);
  });
});
