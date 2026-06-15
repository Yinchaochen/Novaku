import { useQuery } from '@tanstack/react-query';

import { api } from '../../lib/api';

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
}

export function useLinkPreview(url: string | null | undefined) {
  return useQuery({
    queryKey: ['link_preview', url],
    enabled: Boolean(url),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: false,
    queryFn: async () => {
      const res = await api.get('/link-preview', { params: { url } });
      return (res.data.data ?? null) as LinkPreview | null;
    },
  });
}
