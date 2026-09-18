import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useLanguage } from '../../context/LanguageContext';
import { env } from '../../lib/env';
import { loadScript } from '../../lib/loadScript';
import { useAuthStore } from '../../store/authStore';
import { useSignInPromptStore } from '../../store/signInPromptStore';
import { getApiErrorCode } from './useAuth';
import {
  exchangeOAuthContinue,
  OAuthFlowError,
  retryOAuthNetworkFailure,
} from './oauthExchange';
import { clearOAuthRegistrationSession } from './oauthRegistrationSession';

/**
 * Google and Apple sign-in in a browser (D-151).
 *
 * Both end in the same backend exchange as the apps. Google's id_token comes
 * from its own rendered button (components/auth/GoogleWebButton.web.tsx); the
 * audience is the web client id the backend already verifies against. Apple's
 * comes from Sign in with Apple JS in a popup, with a Services ID the backend
 * accepts next to the bundle id.
 */

const GOOGLE_WEB_CLIENT_ID = env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const APPLE_WEB_SERVICES_ID = env.EXPO_PUBLIC_APPLE_WEB_SERVICES_ID ?? '';
const APPLE_JS =
  'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

type AppleSignInResponse = {
  authorization: { id_token: string };
  user?: { name?: { firstName?: string; lastName?: string } };
};

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<AppleSignInResponse>;
      };
    };
  }
}

type ContinueRequest = { endpoint: string; payload: Record<string, unknown> };

function useOAuthContinue() {
  const { setTokens, setUser } = useAuthStore();
  const { langCode, setLangCode } = useLanguage();
  const queryClient = useQueryClient();
  const [clientErrorCode, setClientErrorCode] = useState<string | null>(null);

  const mutation = useMutation({
    retry: retryOAuthNetworkFailure,
    mutationFn: ({ endpoint, payload }: ContinueRequest) =>
      exchangeOAuthContinue(endpoint, payload, langCode, setTokens, setUser),
    onSuccess: async (result) => {
      if (result.status === 'registration_required') {
        // A new account still has to confirm age and terms on its own page;
        // the sheet would otherwise sit on top of it.
        useSignInPromptStore.getState().close();
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

  const start = (request: ContinueRequest) => {
    setClientErrorCode(null);
    clearOAuthRegistrationSession();
    mutation.mutate(request);
  };

  return {
    start,
    setClientErrorCode,
    isPending: mutation.isPending,
    isError: mutation.isError || clientErrorCode !== null,
    error: mutation.error,
    errorCode: clientErrorCode ?? getApiErrorCode(mutation.error),
  };
}

export function useGoogleLogin() {
  const flow = useOAuthContinue();
  return {
    request: Boolean(GOOGLE_WEB_CLIENT_ID),
    // The browser flow starts from Google's own button, which hands back the
    // token itself; there is nothing for our button to open.
    signIn: async () => {},
    exchangeIdToken: (idToken: string) =>
      flow.start({ endpoint: '/auth/google/continue', payload: { id_token: idToken } }),
    reportError: (code: string) => flow.setClientErrorCode(code),
    isPending: flow.isPending,
    isError: flow.isError,
    error: flow.error,
    errorCode: flow.errorCode,
  };
}

function appleRedirectUri() {
  return `${window.location.origin}/login`;
}

let appleReady: Promise<void> | null = null;
function prepareApple(): Promise<void> {
  appleReady ??= loadScript(APPLE_JS).then(() => {
    window.AppleID?.auth.init({
      clientId: APPLE_WEB_SERVICES_ID,
      scope: 'name email',
      redirectURI: appleRedirectUri(),
      usePopup: true,
    });
  });
  appleReady.catch(() => {
    appleReady = null;
  });
  return appleReady;
}

export function useAppleLogin() {
  const flow = useOAuthContinue();

  // Loaded ahead of the click: the popup has to open inside the click itself,
  // or the browser blocks it.
  useEffect(() => {
    if (APPLE_WEB_SERVICES_ID) void prepareApple().catch(() => undefined);
  }, []);

  const signIn = async () => {
    flow.setClientErrorCode(null);
    if (!APPLE_WEB_SERVICES_ID) {
      flow.setClientErrorCode('auth.oauth_unconfigured');
      return;
    }
    try {
      await prepareApple();
      if (!window.AppleID) throw new Error('apple_js_missing');
      const response = await window.AppleID.auth.signIn();
      const idToken = response.authorization?.id_token;
      if (!idToken) {
        flow.setClientErrorCode('auth.oauth_missing_id_token');
        return;
      }
      // Apple sends the name only the first time an account signs in.
      const name = response.user?.name;
      const fullName = name
        ? [name.firstName, name.lastName].filter(Boolean).join(' ') || undefined
        : undefined;
      flow.start({
        endpoint: '/auth/apple/continue',
        payload: { identity_token: idToken, full_name: fullName },
      });
    } catch (error: unknown) {
      const code = (error as { error?: string } | null)?.error;
      if (code === 'popup_closed_by_user' || code === 'user_cancelled_authorize') return;
      flow.setClientErrorCode('auth.oauth_failed');
    }
  };

  return {
    available: Boolean(APPLE_WEB_SERVICES_ID),
    signIn,
    isPending: flow.isPending,
    isError: flow.isError,
    error: flow.error,
    errorCode: flow.errorCode,
  };
}

export async function resetOAuthProviderSelection(_provider: 'google' | 'apple') {}
