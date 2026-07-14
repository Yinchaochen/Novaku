import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface ProposedNodeChange {
  id: string;
  slug: string;
  title: Record<string, string>;
  description: Record<string, string> | null;
  deadline_hint: Record<string, string> | null;
  source_url: string | null;
  verification_status: string;
  last_verified_at: string | null;
  proposed_description: string | null;
  proposed_deadline_hint: string | null;
  proposed_source_url: string | null;
  proposed_at: string | null;
  change_summary: string | null;
}

export function useProposedNodeChanges() {
  return useQuery<ProposedNodeChange[]>({
    queryKey: ['admin', 'freshness', 'proposed-changes'],
    queryFn: async () => {
      const res = await api.get('/admin/odyssey/proposed-changes');
      return res.data.data.items as ProposedNodeChange[];
    },
  });
}

export function useResolveProposedChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nodeId, accept }: { nodeId: string; accept: boolean }) => {
      const res = await api.post(
        `/admin/odyssey/proposed-changes/${nodeId}/${accept ? 'accept' : 'reject'}`,
      );
      return res.data.data as ProposedNodeChange;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'freshness'] });
      await queryClient.invalidateQueries({ queryKey: ['odyssey'] });
    },
  });
}
