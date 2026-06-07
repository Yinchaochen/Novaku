import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { env } from '../../lib/env';
import { useAuthStore } from '../../store/authStore';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const GOOGLE_ANDROID_CLIENT_ID = env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';

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

export function useGoogleLogin() {
  const { setTokens, setUser } = useAuthStore();
  const { langCode, setLangCode } = useLanguage();
  const queryClient = useQueryClient();
  const registrationRef = useRef<OAuthRegistrationInput | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

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

  useEffect(() => {
    if (response?.type === 'success') {
      const accessToken = response.authentication?.accessToken;
      const registration = registrationRef.current;
      registrationRef.current = null;
      if (accessToken) mutation.mutate({ accessToken, registration });
    } else if (response) {
      registrationRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const signIn = async (registration?: OAuthRegistrationInput) => {
    registrationRef.current = registration ?? null;
    try {
      return await promptAsync();
    } catch (error) {
      registrationRef.current = null;
      throw error;
    }
  };

  return {
    request,
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
