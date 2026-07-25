import { Platform } from 'react-native';

import PosterviaAgeAssurance from '../../modules/postervia-age-assurance';

export type PlatformAgeSignal =
  | {
      status: 'shared';
      platform: 'android' | 'ios';
      lowerBound: number | null;
      upperBound: number | null;
    }
  | {
      status: 'not_shared' | 'verification_required' | 'unavailable';
    };

export type OAuthAgeAssurancePayload = {
  platform: 'android' | 'ios';
  method: 'play_age_signals' | 'apple_declared_age_range';
  lower_bound: number;
  upper_bound: number | null;
};

export type AgeAssuranceDecision =
  | { kind: 'eligible'; assurance: OAuthAgeAssurancePayload }
  | { kind: 'underage' }
  | { kind: 'fallback' };

export function resolveAgeAssuranceDecision(
  signal: PlatformAgeSignal,
): AgeAssuranceDecision {
  if (signal.status !== 'shared') return { kind: 'fallback' };
  if (signal.lowerBound !== null && signal.lowerBound >= 16) {
    return {
      kind: 'eligible',
      assurance: {
        platform: signal.platform,
        method:
          signal.platform === 'android'
            ? 'play_age_signals'
            : 'apple_declared_age_range',
        lower_bound: signal.lowerBound,
        upper_bound: signal.upperBound,
      },
    };
  }
  if (signal.upperBound !== null && signal.upperBound < 16) {
    return { kind: 'underage' };
  }
  return { kind: 'fallback' };
}

export async function requestPlatformAgeSignal(): Promise<PlatformAgeSignal> {
  if (
    (Platform.OS !== 'android' && Platform.OS !== 'ios') ||
    !PosterviaAgeAssurance
  ) {
    return { status: 'unavailable' };
  }

  try {
    const result = await PosterviaAgeAssurance.requestAgeRangeAsync();
    if (result.status !== 'shared') return result;
    return {
      ...result,
      platform: Platform.OS,
    };
  } catch {
    return { status: 'unavailable' };
  }
}
