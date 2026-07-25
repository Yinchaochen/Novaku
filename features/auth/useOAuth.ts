import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { env } from '../../lib/env';
import { useAuthStore } from '../../store/authStore';
import { getApiErrorCode, type AuthUser } from './useAuth';
import {
  resolveAgeAssuranceDecision,
  requestPlatformAgeSignal,
} from './ageAssurance';
import {
  clearOAuthRegistrationSession,
  setOAuthRegistrationSession,
  type OAuthRegistrationSession,
} from './oauthRegistrationSession';
import { requiredOAuthRegistrationConsents } from './oauthRegistrationLegal';

const GOOGLE_WEB_CLIENT_ID = env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

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

class OAuthFlowError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function retryOAuthNetworkFailure(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && isAxiosError(error) && !error.response;
}

async function exchangeOAuthContinue(
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

let googleConfigured = false;
function ensureGoogleConfigured() {
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    scopes: ['profile', 'email'],
  });
  googleConfigured = true;
}

export async function resetOAuthProviderSelection(provider: 'google' | 'apple') {
  if (provider !== 'google') return;
  try {
    ensureGoogleConfigured();
    await GoogleSignin.signOut();
  } catch {
    // Best effort. The next account chooser can still recover.
  }
}

export function useGoogleLogin() {
  const { setTokens, setUser } = useAuthStore();
  const { langCode, setLangCode } = useLanguage();
  const queryClient = useQueryClient();
  const [clientErrorCode, setClientErrorCode] = useState<string | null>(null);

  const mutation = useMutation({
    retry: retryOAuthNetworkFailure,
    mutationFn: (idToken: string) =>
      exchangeOAuthContinue(
        '/auth/google/continue',
        { id_token: idToken },
        langCode,
        setTokens,
        setUser,
      ),
    onSuccess: async (result) => {
      if (result.status === 'registration_required') {
        router.push('/oauth-complete' as never);
        return;
      }
      await setLangCode(result.user.locale);
      await queryClient.invalidateQueries({ queryKey: ['odyssey'] });
    },
    onError: (error) => {
      if (error instanceof OAuthFlowError) setClientErrorCode(error.code);
    },
  });

  const signIn = async () => {
    setClientErrorCode(null);
    clearOAuthRegistrationSession();
    if (!GOOGLE_WEB_CLIENT_ID) {
      setClientErrorCode('auth.oauth_unconfigured');
      return;
    }
    ensureGoogleConfigured();
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      const response = await GoogleSignin.signIn();
      if (response.type === 'cancelled') return;
      if (!response.data.idToken) {
        setClientErrorCode('auth.oauth_missing_id_token');
        return;
      }
      mutation.mutate(response.data.idToken);
    } catch (error: unknown) {
      if (
        isErrorWithCode(error) &&
        (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS)
      ) {
        return;
      }
      if (
        isErrorWithCode(error) &&
        error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        setClientErrorCode('auth.google_play_services_unavailable');
        return;
      }
      setClientErrorCode('auth.oauth_failed');
    }
  };

  return {
    request: Boolean(GOOGLE_WEB_CLIENT_ID),
    signIn,
    isPending: mutation.isPending,
    isError: mutation.isError || clientErrorCode !== null,
    error: mutation.error,
    errorCode: clientErrorCode ?? getApiErrorCode(mutation.error),
  };
}

export function useAppleLogin() {
  const { setTokens, setUser } = useAuthStore();
  const { langCode, setLangCode } = useLanguage();
  const queryClient = useQueryClient();
  const [clientErrorCode, setClientErrorCode] = useState<string | null>(null);

  const mutation = useMutation({
    retry: retryOAuthNetworkFailure,
    mutationFn: (credential: AppleAuthentication.AppleAuthenticationCredential) => {
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(' ')
        : undefined;
      return exchangeOAuthContinue(
        '/auth/apple/continue',
        {
          identity_token: credential.identityToken ?? '',
          full_name: fullName,
        },
        langCode,
        setTokens,
        setUser,
      );
    },
    onSuccess: async (result) => {
      if (result.status === 'registration_required') {
        router.push('/oauth-complete' as never);
        return;
      }
      await setLangCode(result.user.locale);
      await queryClient.invalidateQueries({ queryKey: ['odyssey'] });
    },
    onError: (error) => {
      if (error instanceof OAuthFlowError) setClientErrorCode(error.code);
    },
  });

  const signIn = async () => {
    setClientErrorCode(null);
    clearOAuthRegistrationSession();
    try {
      if (!(await AppleAuthentication.isAvailableAsync())) {
        setClientErrorCode('auth.apple_sign_in_unavailable');
        return;
      }
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        setClientErrorCode('auth.oauth_missing_id_token');
        return;
      }
      mutation.mutate(credential);
    } catch (error: unknown) {
      const appleError = error as { code?: string };
      if (appleError.code === 'ERR_REQUEST_CANCELED') return;
      setClientErrorCode('auth.oauth_failed');
    }
  };

  return {
    signIn,
    isPending: mutation.isPending,
    isError: mutation.isError || clientErrorCode !== null,
    error: mutation.error,
    errorCode: clientErrorCode ?? getApiErrorCode(mutation.error),
  };
}
