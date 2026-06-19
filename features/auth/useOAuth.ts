import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { env } from '../../lib/env';
import { useAuthStore } from '../../store/authStore';

const GOOGLE_WEB_CLIENT_ID = env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

export interface OAuthRegistrationInput {
  birth_year: number;
  consents: {
    consent_type: string;
    granted: boolean;
    document_version?: string;
  }[];
}

async function exchangeOAuthTokens(
  endpoint: string,
  payload: Record<string, unknown>,
  locale: string,
  setTokens: (a: string, r: string) => Promise<void>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setUser: (u: any) => void,
) {
  const res = await api.post(endpoint, { ...payload, locale });
  const tokens = res.data.data as { access_token: string; refresh_token: string };
  await setTokens(tokens.access_token, tokens.refresh_token);
  const me = await api.get('/auth/me');
  setUser(me.data.data);
  return me.data.data;
}

// Native Google Sign-In. Replaces the old `expo-auth-session/providers/google`
// web flow, which hit `Error 400: invalid_request` on Android and forced a
// manual Google-password entry on iOS (the in-app browser had no Google
// session). The native SDK uses the device's Google account, returns an access
// token via getTokens(), and we keep verifying it server-side via Google
// userinfo (backend /auth/google unchanged). configure() is idempotent.
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

export function useGoogleLogin() {
  const { setTokens, setUser } = useAuthStore();
  const { langCode, setLangCode } = useLanguage();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      accessToken,
      registration,
    }: {
      accessToken: string;
      registration: OAuthRegistrationInput | null;
    }) =>
      exchangeOAuthTokens(
        '/auth/google',
        {
          access_token: accessToken,
          mode: registration ? 'register' : 'login',
          ...registration,
        },
        langCode,
        setTokens,
        setUser,
      ),
    onSuccess: async (user) => {
      await setLangCode(user.locale);
      await queryClient.invalidateQueries({ queryKey: ['odyssey'] });
      router.replace('/(tabs)/tasks');
    },
  });

  const signIn = async (registration?: OAuthRegistrationInput) => {
    ensureGoogleConfigured();
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      // v13+ returns { type: 'cancelled' } when the user backs out of the picker.
      if (
        response &&
        typeof response === 'object' &&
        'type' in response &&
        (response as { type?: string }).type === 'cancelled'
      ) {
        return;
      }
      const { accessToken } = await GoogleSignin.getTokens();
      if (accessToken) {
        mutation.mutate({ accessToken, registration: registration ?? null });
      }
    } catch (e: unknown) {
      // Cancellations (older SDK throws instead of returning {type:'cancelled'})
      // and concurrent-prompt errors are not real failures.
      if (
        isErrorWithCode(e) &&
        (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)
      ) {
        return;
      }
      throw e;
    }
  };

  return {
    // Kept truthy so the existing screens' `disabled={!google.request}` enables
    // the button (the native flow has no async request to wait on).
    request: true as const,
    signIn,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

export function useAppleLogin() {
  const { setTokens, setUser } = useAuthStore();
  const { langCode, setLangCode } = useLanguage();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      credential,
      registration,
    }: {
      credential: AppleAuthentication.AppleAuthenticationCredential;
      registration: OAuthRegistrationInput | null;
    }) => {
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(' ')
        : undefined;
      return exchangeOAuthTokens(
        '/auth/apple',
        {
          identity_token: credential.identityToken ?? '',
          full_name: fullName,
          mode: registration ? 'register' : 'login',
          ...registration,
        },
        langCode,
        setTokens,
        setUser,
      );
    },
    onSuccess: async (user) => {
      await setLangCode(user.locale);
      await queryClient.invalidateQueries({ queryKey: ['odyssey'] });
      router.replace('/(tabs)/tasks');
    },
  });

  const signIn = async (registration?: OAuthRegistrationInput) => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      mutation.mutate({ credential, registration: registration ?? null });
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code !== 'ERR_REQUEST_CANCELED') throw e;
    }
  };

  return {
    signIn,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
