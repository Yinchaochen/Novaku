import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export interface SocialUserSummary {
  id: string;
  display_id?: string | null;
  display_name: string;
  avatar_url?: string | null;
  city: string;
  identity: string;
}

export interface SocialSearchResult extends SocialUserSummary {
  display_id: string;
  relationship_state: 'none' | 'outgoing_pending' | 'incoming_pending' | 'friends';
}

export interface SocialFriendship {
  id: string;
  status: 'pending' | 'accepted' | 'declined';
  direction: 'incoming' | 'outgoing' | 'friend';
  created_at: string;
  responded_at?: string | null;
  user: SocialUserSummary;
}

export interface SocialGroupMember {
  user: SocialUserSummary;
  role: 'owner' | 'member' | string;
  joined_at: string;
}

export interface SocialGroupEvent {
  id: string;
  title: string;
  description?: string | null;
  city: string;
  place_name: string;
  location_hint?: string | null;
  source_url?: string | null;
  starts_at: string;
  ends_at?: string | null;
  created_at: string;
  created_by: SocialUserSummary;
  viewer_added_to_tasks: boolean;
}

export interface SocialGroupSummary {
  id: string;
  name: string;
  description?: string | null;
  city: string;
  viewer_role: 'owner' | 'member' | string;
  member_count: number;
  event_count: number;
  next_event_at?: string | null;
  members: SocialGroupMember[];
}

export interface SocialGroupDetail extends SocialGroupSummary {
  events: SocialGroupEvent[];
}

export interface SocialOverview {
  friends: SocialFriendship[];
  incoming_requests: SocialFriendship[];
  outgoing_requests: SocialFriendship[];
  groups: SocialGroupSummary[];
}

export function useSocialOverview() {
  const user = useAuthStore((state) => state.user);
  const { langCode } = useLanguage();
  return useQuery({
    queryKey: ['social', 'overview', user?.id, langCode],
    queryFn: async () => {
      const res = await api.get('/social/overview');
      return res.data.data as SocialOverview;
    },
    enabled: Boolean(user),
  });
}

export function useSearchSocialUsers(query: string, enabled = true) {
  const user = useAuthStore((state) => state.user);
  const { langCode } = useLanguage();
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['social', 'search-users', user?.id, trimmed, langCode],
    queryFn: async () => {
      const res = await api.get('/social/search-users', {
        params: { query: trimmed },
      });
      return res.data.data.items as SocialSearchResult[];
    },
    enabled: enabled && Boolean(user) && trimmed.length >= 2,
    staleTime: 30_000,
  });
}

export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; message: string }) => {
      const res = await api.post('/social/friend-requests', {
        user_id: input.userId,
        message: input.message,
      });
      return res.data.data as { friendship: SocialFriendship; created: boolean };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
}

export type SearchVisibility = 'open' | 'limited' | 'hidden';

export function useUpdateSearchVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (visibility: SearchVisibility) => {
      const res = await api.patch('/auth/me/search-visibility', {
        search_visibility: visibility,
      });
      return res.data.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useUserByDisplayId(displayId: string | null, enabled = true) {
  const user = useAuthStore((state) => state.user);
  const { langCode } = useLanguage();
  const trimmed = (displayId ?? '').trim();
  return useQuery({
    queryKey: ['social', 'user-by-display-id', user?.id, trimmed, langCode],
    queryFn: async () => {
      const res = await api.get(`/social/users/by-display-id/${trimmed}`);
      return res.data.data as SocialSearchResult;
    },
    enabled: enabled && Boolean(user) && /^\d{10}$/.test(trimmed),
  });
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const res = await api.post(`/social/friend-requests/${friendshipId}/accept`);
      return res.data.data as SocialFriendship;
    },
    onMutate: async (friendshipId) => {
      await qc.cancelQueries({ queryKey: ['social', 'overview'] });
      const snapshot = qc.getQueriesData<SocialOverview>({ queryKey: ['social', 'overview'] });
      qc.setQueriesData<SocialOverview>(
        { queryKey: ['social', 'overview'] },
        (old) => {
          if (!old) return old;
          const target = old.incoming_requests.find((f) => f.id === friendshipId);
          if (!target) return old;
          return {
            ...old,
            incoming_requests: old.incoming_requests.filter((f) => f.id !== friendshipId),
            friends: [
              ...old.friends,
              { ...target, status: 'accepted', direction: 'friend', responded_at: new Date().toISOString() },
            ],
          };
        },
      );
      return { snapshot };
    },
    onError: (_err, _friendshipId, context) => {
      context?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
}

export function useDeclineFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const res = await api.post(`/social/friend-requests/${friendshipId}/decline`);
      return res.data.data as SocialFriendship;
    },
    onMutate: async (friendshipId) => {
      await qc.cancelQueries({ queryKey: ['social', 'overview'] });
      const snapshot = qc.getQueriesData<SocialOverview>({ queryKey: ['social', 'overview'] });
      qc.setQueriesData<SocialOverview>(
        { queryKey: ['social', 'overview'] },
        (old) =>
          old
            ? { ...old, incoming_requests: old.incoming_requests.filter((f) => f.id !== friendshipId) }
            : old,
      );
      return { snapshot };
    },
    onError: (_err, _friendshipId, context) => {
      context?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
}

export function useCreateSocialGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      city?: string;
      member_ids: string[];
    }) => {
      const res = await api.post('/social/groups', input);
      return res.data.data as SocialGroupSummary;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
}

export function useSocialGroupDetail(groupId: string | null, enabled = true) {
  const user = useAuthStore((state) => state.user);
  const { langCode } = useLanguage();
  return useQuery({
    queryKey: ['social', 'group-detail', groupId, user?.id, langCode],
    queryFn: async () => {
      const res = await api.get(`/social/groups/${groupId}`);
      return res.data.data as SocialGroupDetail;
    },
    enabled: enabled && Boolean(user) && Boolean(groupId),
  });
}

export function useCreateSocialGroupEvent(groupId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      city?: string;
      place_name: string;
      location_hint?: string;
      source_url?: string;
      starts_at: string;
      ends_at?: string;
    }) => {
      const res = await api.post(`/social/groups/${groupId}/events`, input);
      return res.data.data as SocialGroupEvent;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['social'] });
      if (groupId) {
        await qc.invalidateQueries({ queryKey: ['social', 'group-detail', groupId] });
      }
    },
  });
}

export function useAddSocialEventToOdyssey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await api.post(`/social/events/${eventId}/add-to-odyssey`);
      return res.data.data as { odyssey_id: string; created: boolean };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['social'] });
      await qc.invalidateQueries({ queryKey: ['community', 'personal-odysseys'] });
      await qc.invalidateQueries({ queryKey: ['odyssey'] });
    },
  });
}
