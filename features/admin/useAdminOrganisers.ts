import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface OrganiserApplication {
  id: string;
  community_name: string;
  contact_email: string;
  contact_name: string;
  city: string;
  calendar_url: string;
  website_url: string;
  about: string;
  status: 'pending' | 'approved' | 'rejected';
  review_note: string;
  created_at: string;
  claim_invite_sent_at: string | null;
  calendar_recognised: boolean;
  account_email: string | null;
  claimed: boolean;
}

export interface OrganiserApplicationDraft {
  community_name: string;
  contact_email: string;
  city: string;
  contact_name: string;
  calendar_url: string;
  website_url: string;
}

export function useOrganiserApplications(status: 'pending' | 'approved') {
  return useQuery<OrganiserApplication[]>({
    queryKey: ['admin', 'organisers', status],
    queryFn: async () => {
      const res = await api.get(`/admin/organisers/applications?status=${status}`);
      return res.data.data.items as OrganiserApplication[];
    },
  });
}

export function useCreateOrganiserApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draft: OrganiserApplicationDraft) => {
      const res = await api.post('/admin/organisers/applications', draft);
      return res.data.data as OrganiserApplication;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'organisers'] });
    },
  });
}

export function useReviewOrganiserApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const res = await api.post(
        `/admin/organisers/applications/${id}/${approve ? 'approve' : 'reject'}`,
        { note: '' },
      );
      return res.data.data as OrganiserApplication;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'organisers'] });
    },
  });
}

export function useSendClaimInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/admin/organisers/applications/${id}/send-claim-invite`);
      return res.data.data as OrganiserApplication;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'organisers'] });
    },
  });
}
