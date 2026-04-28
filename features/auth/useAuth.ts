import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  } | null;
};

export function getApiErrorCode(error: unknown): string | null {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as ApiErrorPayload | undefined;
    return payload?.error?.code ?? null;
  }

  return null;
}

export function useLogin() {
  const { setTokens, setUser } = useAuthStore();
  const { setLangCode } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.post('/auth/login', data);
      const tokens = res.data.data as { access_token: string; refresh_token: string };
      await setTokens(tokens.access_token, tokens.refresh_token);
      const me = await api.get('/auth/me');
      return me.data.data;
    },
    onSuccess: async (user) => {
      setUser(user);
      await setLangCode(user.locale);
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useRegister() {
  const { setTokens, setUser } = useAuthStore();
  const { setLangCode } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      display_name: string;
      identity: string;
      locale?: string;
    }) => {
      await api.post('/auth/register', data);
      const login = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });
      const tokens = login.data.data as { access_token: string; refresh_token: string };
      await setTokens(tokens.access_token, tokens.refresh_token);
      const me = await api.get('/auth/me');
      return me.data.data;
    },
    onSuccess: async (user) => {
      setUser(user);
      await setLangCode(user.locale);
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await api.post('/auth/forgot-password', data);
      return res.data.data as { accepted: boolean };
    },
  });
}

export function useVerifyResetPasswordToken(token: string | null, enabled = true) {
  return useQuery({
    queryKey: ['auth', 'reset-password-verify', token],
    enabled: enabled && Boolean(token),
    queryFn: async () => {
      const res = await api.post('/auth/reset-password/verify', { token });
      return res.data.data as { valid: boolean };
    },
    retry: false,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      const res = await api.post('/auth/reset-password', data);
      return res.data.data as { reset: boolean };
    },
  });
}

export function useUpdateIdentity() {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (identity: string) => {
      const res = await api.patch('/auth/me', { identity });
      return res.data.data;
    },
    onSuccess: async (user) => {
      setUser(user);
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useMe() {
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      const user = res.data.data;
      setUser(user);
      return user;
    },
  });
}
