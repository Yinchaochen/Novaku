import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api';

export interface AdminAppRelease {
  id: string;
  version: string;
  source_locale: string;
  title: string;
  highlights: string[];
  is_published: boolean;
  locales: string[];
  updated_at: string | null;
}

export interface AppReleaseDraft {
  version: string;
  title: string;
  highlights: string[];
  is_published: boolean;
}

const KEY = ['admin', 'app-releases'];

export function useAppReleases() {
  return useQuery<AdminAppRelease[]>({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.get('/admin/app-releases');
      return res.data.data.items as AdminAppRelease[];
    },
  });
}

export function useCreateAppRelease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draft: AppReleaseDraft) => {
      const res = await api.post('/admin/app-releases', draft);
      return res.data.data as AdminAppRelease;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateAppRelease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<AppReleaseDraft>) => {
      const res = await api.patch(`/admin/app-releases/${id}`, patch);
      return res.data.data as AdminAppRelease;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteAppRelease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/app-releases/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
