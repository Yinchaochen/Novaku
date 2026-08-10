import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api } from '../../lib/api';

export interface AdminAccountLookup {
  id: string;
  display_id: string;
  display_name: string;
  city: string | null;
  identity: string;
  is_verified: boolean;
  verified_at: string | null;
}

/**
 * Look up exactly one account by its public 10-digit ID. Deliberately not a
 * name search: granting a badge acts on a specific person, and a fuzzy list
 * invites picking the wrong one.
 */
export function useAccountLookup() {
  const [account, setAccount] = useState<AdminAccountLookup | null>(null);
  const [notFound, setNotFound] = useState(false);

  const lookup = useMutation({
    mutationFn: async (displayId: string) => {
      const res = await api.get('/admin/users/lookup', { params: { display_id: displayId } });
      return res.data.data as AdminAccountLookup;
    },
    onSuccess: (data) => {
      setAccount(data);
      setNotFound(false);
    },
    onError: () => {
      setAccount(null);
      setNotFound(true);
    },
  });

  return { account, setAccount, notFound, lookup };
}

export function useSetAccountVerified() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, verified }: { userId: string; verified: boolean }) => {
      const res = await api.post(`/admin/users/${userId}/verified`, null, { params: { verified } });
      return res.data.data as AdminAccountLookup;
    },
    onSuccess: async () => {
      // The badge renders from cached author payloads all over the feed.
      await queryClient.invalidateQueries({ queryKey: ['community'] });
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
