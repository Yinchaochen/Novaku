import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export type ReportContentType = 'post' | 'comment' | 'message' | 'profile' | 'media';

export type ReportReason =
  | 'illegal_content'
  | 'hate_speech'
  | 'harassment'
  | 'sexual_content_minor'
  | 'violence'
  | 'terrorism'
  | 'csam'
  | 'self_harm'
  | 'spam'
  | 'copyright'
  | 'impersonation'
  | 'misinformation'
  | 'tos_violation'
  | 'other';

export interface ReportPayload {
  content_type: ReportContentType;
  content_id: string;
  reason_category: ReportReason;
  reason_description: string;
  good_faith_declaration: boolean;
}

export function useSubmitReport() {
  return useMutation({
    mutationFn: async (payload: ReportPayload) => {
      const res = await api.post('/compliance/reports', payload);
      return res.data.data as { id: string; status: string; priority: string };
    },
  });
}

export type DSRRequestType =
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'restriction'
  | 'portability'
  | 'objection'
  | 'no_automated';

export interface DSRRequest {
  id: string;
  request_type: DSRRequestType;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'extended';
  requested_at: string;
  due_at: string;
  completed_at: string | null;
  rejection_reason: string | null;
  response: Record<string, unknown> | null;
}

export interface AccountStatus {
  pending_deletion_at: string | null;
  deletion_grace_days_remaining: number | null;
  processing_restricted_at: string | null;
}

export function useAccountStatus() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['compliance', 'account-status'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get('/compliance/account-status');
      return res.data.data as AccountStatus;
    },
    staleTime: 60_000,
  });
}

export function useDSRList() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['compliance', 'dsr'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await api.get('/compliance/dsr');
      return (res.data.data?.items ?? []) as DSRRequest[];
    },
  });
}

export function useCreateDSR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { request_type: DSRRequestType; details?: Record<string, unknown> }) => {
      const res = await api.post('/compliance/dsr', payload);
      return res.data.data as DSRRequest;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['compliance', 'dsr'] });
      void qc.invalidateQueries({ queryKey: ['compliance', 'account-status'] });
    },
  });
}

export function useCancelDeletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/compliance/dsr/cancel-deletion');
      return res.data.data as { cancelled: boolean };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['compliance', 'dsr'] });
      void qc.invalidateQueries({ queryKey: ['compliance', 'account-status'] });
    },
  });
}

export function useLiftRestriction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/compliance/dsr/lift-restriction');
      return res.data.data as { lifted: boolean };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['compliance', 'account-status'] });
    },
  });
}

export function useFetchDSRDownload() {
  return useMutation({
    mutationFn: async (dsrId: string) => {
      const res = await api.get(`/compliance/dsr/${dsrId}/download`);
      return res.data.data as { download_url: string; expires_at: string; byte_size: number };
    },
  });
}
