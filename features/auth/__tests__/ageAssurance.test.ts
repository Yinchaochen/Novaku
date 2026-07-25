import { resolveAgeAssuranceDecision } from '../ageAssurance';

describe('resolveAgeAssuranceDecision', () => {
  it('allows automatic registration only when the shared lower bound is 16+', () => {
    expect(
      resolveAgeAssuranceDecision({
        status: 'shared',
        platform: 'android',
        lowerBound: 16,
        upperBound: 17,
      }),
    ).toEqual({
      kind: 'eligible',
      assurance: {
        platform: 'android',
        method: 'play_age_signals',
        lower_bound: 16,
        upper_bound: 17,
      },
    });
  });

  it('rejects a range that is wholly below 16', () => {
    expect(
      resolveAgeAssuranceDecision({
        status: 'shared',
        platform: 'ios',
        lowerBound: 13,
        upperBound: 15,
      }),
    ).toEqual({ kind: 'underage' });
  });

  it.each([
    { status: 'not_shared' as const },
    { status: 'verification_required' as const },
    { status: 'unavailable' as const },
    {
      status: 'shared' as const,
      platform: 'ios' as const,
      lowerBound: null,
      upperBound: null,
    },
    {
      status: 'shared' as const,
      platform: 'android' as const,
      lowerBound: 13,
      upperBound: 17,
    },
  ])('falls back when the signal cannot prove 16+: %o', (signal) => {
    expect(resolveAgeAssuranceDecision(signal)).toEqual({ kind: 'fallback' });
  });
});
