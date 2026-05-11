import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export type BuddyServiceCategory = 'errand' | 'medical' | 'shopping' | 'meal';
export type BuddyGender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
export type BuddyApplicationStatus = 'pending' | 'approved' | 'rejected' | 'invited';
export type BuddyReferralSource =
  | 'xiaohongshu'
  | 'reddit'
  | 'wechat'
  | 'instagram'
  | 'friend'
  | 'direct'
  | 'other';

export interface BuddyApplicationCreateInput {
  full_name: string;
  age: number;
  gender: BuddyGender;
  city: string;
  bio: string;
}

export interface BuddyApplication {
  id: string;
  user_id: string;
  full_name: string;
  whatsapp: string;
  city: string;
  gender: BuddyGender | null;
  age: number | null;
  native_languages: string[];
  fluent_languages: string[] | null;
  years_in_city: number | null;
  bio: string;
  experience: string | null;
  willing_to_serve_female_only: boolean;
  service_categories: BuddyServiceCategory[];
  status: BuddyApplicationStatus;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  referral_source: BuddyReferralSource | null;
  submitted_locale: string | null;
  created_at: string;
  updated_at: string;
}

export interface BuddyApplicationListItem {
  id: string;
  user_id: string;
  full_name: string;
  whatsapp: string;
  city: string;
  status: BuddyApplicationStatus;
  service_categories: BuddyServiceCategory[];
  submitted_locale: string | null;
  referral_source: BuddyReferralSource | null;
  created_at: string;
}

export function useMyBuddyApplication() {
  const user = useAuthStore((s) => s.user);
  return useQuery<BuddyApplication | null>({
    queryKey: ['buddy', 'me', user?.id],
    queryFn: async () => {
      const res = await api.get('/buddy/applications/me');
      return (res.data.data as BuddyApplication | null) ?? null;
    },
    enabled: Boolean(user),
  });
}

export function useSubmitBuddyApplication() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (input: BuddyApplicationCreateInput) => {
      const res = await api.post('/buddy/applications', input);
      return res.data.data as BuddyApplication;
    },
    onSuccess: async (application) => {
      queryClient.setQueryData(['buddy', 'me', user?.id], application);
      await queryClient.invalidateQueries({ queryKey: ['buddy', 'admin'] });
    },
  });
}

export function useAdminBuddyApplications(status: BuddyApplicationStatus | null) {
  return useQuery<BuddyApplicationListItem[]>({
    queryKey: ['buddy', 'admin', status ?? 'all'],
    queryFn: async () => {
      const res = await api.get('/buddy/admin/applications', {
        params: status ? { status } : undefined,
      });
      return res.data.data as BuddyApplicationListItem[];
    },
  });
}

export function useAdminBuddyApplicationDetail(applicationId: string | null) {
  return useQuery<BuddyApplication>({
    queryKey: ['buddy', 'admin', 'detail', applicationId],
    queryFn: async () => {
      const res = await api.get(`/buddy/admin/applications/${applicationId}`);
      return res.data.data as BuddyApplication;
    },
    enabled: Boolean(applicationId),
  });
}

export function useAdminUpdateBuddyApplication(applicationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { status: BuddyApplicationStatus; reviewer_notes: string | null }) => {
      const res = await api.patch(`/buddy/admin/applications/${applicationId}`, input);
      return res.data.data as BuddyApplication;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['buddy', 'admin'] });
    },
  });
}
