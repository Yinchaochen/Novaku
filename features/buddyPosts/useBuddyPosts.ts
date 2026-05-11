import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export type BuddyPostType = 'companion' | 'errand_carry';

export type BuddyPostCategory =
  | 'anmeldung'
  | 'medical'
  | 'shopping'
  | 'meal'
  | 'walking'
  | 'language_help'
  | 'errand_carry'
  | 'other';

export type BuddyPostPricingMode = 'fixed' | 'free' | 'negotiable';

export interface BuddyPostAuthor {
  id: string;
  display_id: string;
  display_name: string;
  avatar_url: string | null;
  gender: string | null;
  age: number | null;
  city: string | null;
  author_trust_score: number;
}

export interface BuddyPost {
  id: string;
  author: BuddyPostAuthor;
  type: BuddyPostType;
  category: BuddyPostCategory;
  title: string;
  body: string;
  price_cents: number;
  pricing_mode: BuddyPostPricingMode;
  currency: string;
  available_at: string | null;
  available_until: string | null;
  depart_date: string | null;
  return_date: string | null;
  from_city: string | null;
  to_city: string | null;
  accepts_shipping: boolean;
  expired_at: string;
  created_at: string;
  is_owner: boolean;
  is_active: boolean;
}

export interface BuddyPostFeedFilter {
  type?: BuddyPostType;
  category?: BuddyPostCategory;
  city?: string;
  timeWindow?: 'today' | 'week' | 'month';
}

export type BuddyPostBucket = 'active' | 'expired' | 'deleted';

const FEED_KEY = (filter: BuddyPostFeedFilter) =>
  ['buddy_posts', 'feed', filter.type ?? 'all', filter.category ?? 'all', filter.city ?? '', filter.timeWindow ?? ''] as const;

export function useBuddyPostsFeed(filter: BuddyPostFeedFilter = {}) {
  const user = useAuthStore((s) => s.user);
  const { langCode } = useLanguage();
  return useInfiniteQuery({
    queryKey: [...FEED_KEY(filter), user?.id, langCode],
    queryFn: async ({ pageParam }) => {
      const res = await api.get('/buddy/posts', {
        params: {
          type: filter.type,
          category: filter.category,
          city: filter.city,
          time_window: filter.timeWindow,
          cursor: pageParam,
          limit: 20,
        },
      });
      return res.data.data as { items: BuddyPost[]; next_cursor: string | null };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: Boolean(user),
    staleTime: 30_000,
  });
}

export function useBuddyPost(postId: string | null) {
  const user = useAuthStore((s) => s.user);
  const { langCode } = useLanguage();
  return useQuery({
    queryKey: ['buddy_posts', 'detail', postId, user?.id, langCode],
    queryFn: async () => {
      const res = await api.get(`/buddy/posts/${postId}`);
      return res.data.data as BuddyPost;
    },
    enabled: Boolean(user) && Boolean(postId),
  });
}

export function useMyBuddyPosts(bucket: BuddyPostBucket) {
  const user = useAuthStore((s) => s.user);
  const { langCode } = useLanguage();
  return useQuery({
    queryKey: ['buddy_posts', 'mine', bucket, user?.id, langCode],
    queryFn: async () => {
      const res = await api.get('/buddy/posts/me', { params: { bucket } });
      return res.data.data.items as BuddyPost[];
    },
    enabled: Boolean(user),
  });
}

export interface CreateBuddyPostInput {
  type: BuddyPostType;
  category: BuddyPostCategory;
  title: string;
  body: string;
  price_cents: number;
  pricing_mode: BuddyPostPricingMode;
  currency: string;
  available_at?: string;
  available_until?: string;
  depart_date?: string;
  return_date?: string;
  from_city?: string;
  to_city?: string;
  accepts_shipping?: boolean;
}

export function useCreateBuddyPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBuddyPostInput) => {
      const res = await api.post('/buddy/posts', input);
      return res.data.data as BuddyPost;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['buddy_posts'] });
    },
  });
}

export interface UpdateBuddyPostInput {
  title?: string;
  body?: string;
  price_cents?: number;
  currency?: string;
  accepts_shipping?: boolean;
}

export function useUpdateBuddyPost(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateBuddyPostInput) => {
      const res = await api.patch(`/buddy/posts/${postId}`, input);
      return res.data.data as BuddyPost;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['buddy_posts'] });
    },
  });
}

export function useDeleteBuddyPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await api.delete(`/buddy/posts/${postId}`);
      return res.data.data as BuddyPost;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['buddy_posts'] });
    },
  });
}

export function useChatByBuddyPost() {
  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await api.get(`/chat/conversations/by-buddy-post/${postId}`);
      return res.data.data as { id: string };
    },
  });
}
