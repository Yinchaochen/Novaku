import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { AuthUser } from './useAuth';
import {
  clearOAuthRegistrationSession,
  getOAuthRegistrationSession,
} from './oauthRegistrationSession';

export interface OAuthRegistrationInput {
  birth_date: string;
  consents: {
    consent_type: string;
    granted: boolean;
    document_version?: string;
  }[];
}

export function useCompleteOAuthRegistration() {
  const { langCode, setLangCode } = useLanguage();
  const { setTokens, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    retry: (failureCount, error) =>
      failureCount < 1 && isAxiosError(error) && !error.response,
    mutationFn: async (input: OAuthRegistrationInput) => {
      const session = getOAuthRegistrationSession();
      if (!session) throw new Error('oauth_registration_session_missing');
      const response = await api.post('/auth/oauth/complete-registration', {
        registration_ticket: session.registrationTicket,
        locale: langCode,
        ...input,
      });
      const tokens = response.data.data as {
        access_token: string;
        refresh_token: string;
      };
      await setTokens(tokens.access_token, tokens.refresh_token);
      const me = await api.get('/auth/me');
      const user = me.data.data as AuthUser;
      setUser(user);
      return user;
    },
    onSuccess: async (user) => {
      clearOAuthRegistrationSession();
      await setLangCode(user.locale);
      await queryClient.invalidateQueries({ queryKey: ['odyssey'] });
    },
  });
}
