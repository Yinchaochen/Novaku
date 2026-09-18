import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { env } from '../../lib/env';
import PosterviaGoogleSignin from '../../modules/postervia-google-signin';
import { useAuthStore } from '../../store/authStore';
import { getApiErrorCode } from './useAuth';
import {
  exchangeOAuthContinue,
  OAuthFlowError,
  retryOAuthNetworkFailure,
} from './oauthExchange';
import { clearOAuthRegistrationSession } from './oauthRegistrationSession';

const GOOGLE_WEB_CLIENT_ID = env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

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
    if (Platform.OS === 'android') {
      await PosterviaGoogleSignin?.signOutAsync();
      return;
    }
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
    if (Platform.OS === 'android') {
      // Credential Manager bottom sheet (SiWG button flow); the GoogleSignin SDK
      // path below stays iOS-only because its Android side is the deprecated chooser.
      if (!PosterviaGoogleSignin) {
        setClientErrorCode('auth.oauth_failed');
        return;
      }
      try {
        const result = await PosterviaGoogleSignin.signInAsync(GOOGLE_WEB_CLIENT_ID);
        if (result.status === 'cancelled') return;
        if (result.status === 'no_credential') {
          setClientErrorCode('auth.google_play_services_unavailable');
          return;
        }
        if (result.status !== 'success') {
          setClientErrorCode('auth.oauth_failed');
          return;
        }
        if (!result.idToken) {
          setClientErrorCode('auth.oauth_missing_id_token');
          return;
        }
        mutation.mutate(result.idToken);
      } catch {
        setClientErrorCode('auth.oauth_failed');
      }
      return;
    }
    ensureGoogleConfigured();
    try {
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
      setClientErrorCode('auth.oauth_failed');
    }
  };

  return {
    request: Boolean(GOOGLE_WEB_CLIENT_ID),
    signIn,
    // Used by the browser build's Google button (useOAuth.web.ts); same shape here.
    exchangeIdToken: (idToken: string) => {
      setClientErrorCode(null);
      mutation.mutate(idToken);
    },
    reportError: (code: string) => setClientErrorCode(code),
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
    available: Platform.OS === 'ios',
    signIn,
    isPending: mutation.isPending,
    isError: mutation.isError || clientErrorCode !== null,
    error: mutation.error,
    errorCode: clientErrorCode ?? getApiErrorCode(mutation.error),
  };
}
