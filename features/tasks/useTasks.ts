import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export function useDag() {
  const { langCode } = useLanguage();
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['odyssey', 'dag', user?.id, user?.city, user?.identity, langCode],
    queryFn: async () => {
      const res = await api.get('/odyssey/dag', {
        timeout: 30000,
        params: {
          city: user?.city,
          identity: user?.identity,
        },
      });
      return res.data.data;
    },
    enabled: Boolean(user),
    placeholderData: (previousData) => previousData,
  });
}

export function useStartOdyssey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (odysseyId: string) => api.post(`/odyssey/${odysseyId}/start`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['odyssey'] }),
  });
}

export function useCompleteOdyssey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (odysseyId: string) => api.post(`/odyssey/${odysseyId}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['odyssey'] }),
  });
}

export function useSkipOdyssey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (odysseyId: string) => api.post(`/odyssey/${odysseyId}/skip`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['odyssey'] }),
  });
}

export function useRedoOdyssey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (odysseyId: string) => api.post(`/odyssey/${odysseyId}/redo`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['odyssey'] }),
  });
}

export function useSetOdysseyNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ odysseyId, notes }: { odysseyId: string; notes: string }) =>
      api.patch(`/odyssey/${odysseyId}/note`, { notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['odyssey'] }),
  });
}

export function useDiscardOdyssey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (odysseyId: string) => api.post(`/odyssey/${odysseyId}/discard`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['odyssey'] }),
  });
}

export function useRestoreOdyssey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (odysseyId: string) => api.post(`/odyssey/${odysseyId}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['odyssey'] });
      qc.invalidateQueries({ queryKey: ['community'] });
    },
  });
}

export function useRestorePersonalOdyssey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (odysseyId: string) => api.post(`/community/personal-odysseys/${odysseyId}/redo`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['odyssey'] });
      qc.invalidateQueries({ queryKey: ['community'] });
    },
  });
}

export interface OdysseyHistoryItem {
  node: {
    id: string;
    slug: string | null;
    title: Record<string, string>;
    description: Record<string, string> | null;
    type: 'main' | 'side';
    source_url: string | null;
    kind: 'canonical' | 'personal';
  };
  state: {
    odyssey_node_id: string;
    status: string;
    completed_at: string | null;
    discarded_at: string | null;
    started_at: string | null;
  };
}

export function useOdysseyHistory() {
  const { langCode } = useLanguage();
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['odyssey', 'history', user?.id, langCode],
    queryFn: async () => {
      const res = await api.get('/odyssey/history');
      return res.data.data as { completed: OdysseyHistoryItem[]; discarded: OdysseyHistoryItem[] };
    },
    enabled: Boolean(user),
  });
}
