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

export type UserIdentity = 'newcomer' | 'resident' | 'traveler' | 'local';
export type OnboardingArrivalStage = 'just_arrived' | 'settled' | 'local';
export type OnboardingIntentTag = 'study' | 'work' | 'travel' | 'settle';
export type OnboardingLocationSource = 'device' | 'manual';

export interface AuthUser {
  id: string;
  display_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  locale: string;
  identity: UserIdentity;
  city: string;
  origin_city: string | null;
  arrival_stage: OnboardingArrivalStage | null;
  intent_tags: OnboardingIntentTag[];
  onboarding_completed: boolean;
  location_source: OnboardingLocationSource | null;
  latitude: number | null;
  longitude: number | null;
  bio: string | null;
  tab_notes_public: boolean;
  tab_comments_public: boolean;
  tab_saves_public: boolean;
  tab_likes_public: boolean;
  is_staff: boolean;
  is_vianter_plus: boolean;
  search_visibility: 'open' | 'limited' | 'hidden';
  gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | null;
  buddy_publish_banned_at: string | null;
}

export interface CitySuggestion {
  name: string;
  subtitle: string;
  latitude: number;
  longitude: number;
}

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
      return me.data.data as AuthUser;
    },
    onSuccess: async (user) => {
      setUser(user);
      await setLangCode(user.locale);
      await queryClient.invalidateQueries({ queryKey: ['odyssey'] });
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
      locale?: string;
      birth_year: number;
      gender?: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
      consents: { consent_type: string; granted: boolean; document_version?: string }[];
    }) => {
      await api.post('/auth/register', data);
      const login = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });
      const tokens = login.data.data as { access_token: string; refresh_token: string };
      await setTokens(tokens.access_token, tokens.refresh_token);
      const me = await api.get('/auth/me');
      return me.data.data as AuthUser;
    },
    onSuccess: async (user) => {
      setUser(user);
      await setLangCode(user.locale);
      await queryClient.invalidateQueries({ queryKey: ['odyssey'] });
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
      await queryClient.invalidateQueries({ queryKey: ['odyssey'] });
    },
  });
}

export function useUpdateProfile() {
  const { setUser } = useAuthStore();
  const { setLangCode } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      display_name?: string;
      locale?: string;
      avatar_url?: string | null;
      city?: string;
      origin_city?: string | null;
      identity?: UserIdentity;
      arrival_stage?: OnboardingArrivalStage;
      intent_tags?: OnboardingIntentTag[];
      onboarding_completed?: boolean;
      location_source?: OnboardingLocationSource;
      latitude?: number | null;
      longitude?: number | null;
      bio?: string | null;
      tab_notes_public?: boolean;
      tab_comments_public?: boolean;
      tab_saves_public?: boolean;
      tab_likes_public?: boolean;
      gender?: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
    }) => {
      const res = await api.patch('/auth/me', data);
      return res.data.data as AuthUser;
    },
    onMutate: (data) => {
      // Optimistic: merge patches into the cached user so subscribers
      // (PrivacyModal switches, identity chips, avatar tiles) re-render in
      // the same frame as the tap. Skip `locale` — switching it triggers an
      // i18next reload that should happen after server confirms, not before.
      const previous = useAuthStore.getState().user;
      if (!previous) return { previous: null };
      const patches: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && key !== 'locale') {
          patches[key] = value;
        }
      }
      setUser({ ...previous, ...patches } as AuthUser);
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        setUser(context.previous);
      }
    },
    onSuccess: async (user) => {
      setUser(user);
      if (user.locale) {
        await setLangCode(user.locale);
      }
      await queryClient.invalidateQueries({ queryKey: ['community'] });
      await queryClient.invalidateQueries({ queryKey: ['odyssey'] });
    },
  });
}

export function useUploadAvatar() {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uri, mimeType, fileName }: { uri: string; mimeType: string; fileName: string }) => {
      const form = new FormData();
      form.append('file', { uri, name: fileName, type: mimeType } as any);
      const res = await api.post('/auth/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data as {
        avatar: { avatar_url: string };
        user: AuthUser;
      };
    },
    onSuccess: async (payload) => {
      setUser(payload.user);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.invalidateQueries({ queryKey: ['community'] });
    },
  });
}

export function useMe() {
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      const user = res.data.data as AuthUser;
      setUser(user);
      return user;
    },
  });
}

export function useCitySuggestions(query: string, enabled = true) {
  const { langCode } = useLanguage();
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['auth', 'city-suggestions', trimmed, langCode],
    queryFn: async () => {
      const res = await api.get('/auth/city-suggestions', {
        params: { query: trimmed },
      });
      return res.data.data.items as CitySuggestion[];
    },
    enabled: enabled && trimmed.length >= 2,
    staleTime: 60_000,
  });
}

export function useResolveCityFromCoordinates() {
  return useMutation({
    mutationFn: async (data: { latitude: number; longitude: number }) => {
      const res = await api.get('/auth/city-from-coordinates', {
        params: data,
      });
      return res.data.data as CitySuggestion;
    },
  });
}
