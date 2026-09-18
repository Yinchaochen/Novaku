import { isAxiosError } from 'axios';

import { api } from '../../lib/api';
import { type AuthUser } from './useAuth';
import {
  resolveAgeAssuranceDecision,
  requestPlatformAgeSignal,
} from './ageAssurance';
import {
  setOAuthRegistrationSession,
  type OAuthRegistrationSession,
} from './oauthRegistrationSession';
import { requiredOAuthRegistrationConsents } from './oauthRegistrationLegal';

// Shared by the native providers (useOAuth.ts) and the web ones (useOAuth.web.ts):
// both end in the same backend exchange, only the way the token is obtained differs.

type OAuthContinueResponse =
  | {
      status: 'authenticated';
      access_token: string;
      refresh_token: string;
      token_type: 'bearer';
      registration_ticket: null;
      profile: null;
    }
  | {
      status: 'registration_required';
      access_token: null;
      refresh_token: null;
      token_type: null;
      registration_ticket: string;
      profile: {
        provider: 'google' | 'apple';
        email: string;
        display_name: string;
        avatar_url: string | null;
      };
    };

type OAuthMutationResult =
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'registration_required' };

export class OAuthFlowError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export function retryOAuthNetworkFailure(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && isAxiosError(error) && !error.response;
}

export async function exchangeOAuthContinue(
  endpoint: string,
  payload: Record<string, unknown>,
  locale: string,
  setTokens: (access: string, refresh: string) => Promise<void>,
  setUser: (user: AuthUser) => void,
): Promise<OAuthMutationResult> {
  const response = await api.post(endpoint, { ...payload, locale });
  const result = response.data.data as OAuthContinueResponse;
  if (result.status === 'registration_required') {
    const session: OAuthRegistrationSession = {
      registrationTicket: result.registration_ticket,
      profile: {
        provider: result.profile.provider,
        email: result.profile.email,
        displayName: result.profile.display_name,
        avatarUrl: result.profile.avatar_url,
      },
    };
    const ageDecision = resolveAgeAssuranceDecision(await requestPlatformAgeSignal());
    if (ageDecision.kind === 'underage') {
      throw new OAuthFlowError('auth.underage');
    }
    if (ageDecision.kind === 'fallback') {
      setOAuthRegistrationSession(session);
      return { status: 'registration_required' };
    }

    const completed = await api.post('/auth/oauth/complete-registration', {
      registration_ticket: session.registrationTicket,
      locale,
      age_assurance: ageDecision.assurance,
      consents: requiredOAuthRegistrationConsents(),
    });
    const tokens = completed.data.data as {
      access_token: string;
      refresh_token: string;
    };
    await setTokens(tokens.access_token, tokens.refresh_token);
    const me = await api.get('/auth/me');
    const user = me.data.data as AuthUser;
    setUser(user);
    return { status: 'authenticated', user };
  }

  await setTokens(result.access_token, result.refresh_token);
  const me = await api.get('/auth/me');
  const user = me.data.data as AuthUser;
  setUser(user);
  return { status: 'authenticated', user };
}
