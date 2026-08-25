import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface LumaSeedCalendar {
  calendar_id: string;
  organiser: string;
  source: 'env' | 'discovered';
  enabled: boolean;
  city: string | null;
  found_via: string | null;
  created_at: string | null;
}

export function useLumaSeedCalendars() {
  return useQuery<LumaSeedCalendar[]>({
    queryKey: ['admin', 'luma-calendars'],
    queryFn: async () => {
      const res = await api.get('/admin/luma-calendars');
      return res.data.data.items as LumaSeedCalendar[];
    },
  });
}
