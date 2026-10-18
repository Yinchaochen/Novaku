import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export type SourceChangeKind =
  | 'time'
  | 'place'
  | 'deadline'
  | 'cancelled'
  | 'postponed'
  | 'gone'
  | 'text';

export interface PostSourceChange {
  id: string;
  kind: SourceChangeKind;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  quote: string | null;
  created_at: string | null;
  status: string;
  post_id: string;
  post_title: string;
  event_starts_at: string | null;
  action_deadline_at: string | null;
  source_kind: string;
  source_url: string | null;
}

export type SourceChangeAction = 'apply' | 'expire' | 'dismiss';

export function usePostSourceChanges() {
  return useQuery<PostSourceChange[]>({
    queryKey: ['admin', 'post-sources', 'proposed-changes'],
    queryFn: async () => {
      const res = await api.get('/admin/community/post-sources/proposed-changes');
      return res.data.data.items as PostSourceChange[];
    },
  });
}

export function useResolvePostSourceChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: SourceChangeAction }) => {
      const res = await api.post(`/admin/community/post-sources/proposed-changes/${id}/${action}`);
      return res.data.data as PostSourceChange;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'post-sources'] });
      await queryClient.invalidateQueries({ queryKey: ['community'] });
    },
  });
}
