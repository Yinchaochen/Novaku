import {
  InfiniteData,
  QueryClient,
  QueryKey,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { useFeedForegroundRefresh } from './useFeedForegroundRefresh';
import { addSentryBreadcrumb } from '../../lib/sentry';
import { useAuthStore } from '../../store/authStore';

const COMMUNITY_POST_WRITE_TIMEOUT_MS = 30_000;

// P2.6 (audit FE-CRIT-8): every optimistic-update onError below adds a
// breadcrumb tagged with the mutation name. Sentry event capture for 5xx /
// network failures still happens in the axios response interceptor — this
// breadcrumb just attaches mutation context so we can tell in the dashboard
// which user-action surfaced the error.
function _bc(mutation: string) {
  addSentryBreadcrumb('community.mutation_error', { mutation });
}

export interface CommunityPostMedia {
  id?: string | null;
  media_url: string;
  /** 600px WebP for feed cards; null on pre-thumbnail uploads → fall back to media_url. */
  thumb_url?: string | null;
  mime_type?: string | null;
  sort_order: number;
  /** Video items only (D-033); null/undefined for images. */
  duration_seconds?: number | null;
}

export function isVideoMedia(item: Pick<CommunityPostMedia, 'mime_type'>): boolean {
  return (item.mime_type ?? '').startsWith('video/');
}

export interface CommunityActionCandidate {
  id: string;
  entity_type: string;
  entity_name?: string | null;
  action_type: string;
  title: string;
  description?: string | null;
  linked_odyssey_slug?: string | null;
  source_url?: string | null;
  verification_status: 'unverified' | 'community' | 'source_attached' | 'verified' | 'stale' | 'conflicting';
  reliability_score: number;
  last_verified_at?: string | null;
  next_verify_at?: string | null;
  metadata_json?: Record<string, unknown> | null;
  source_language: string;
  title_source_language: string;
  description_source_language?: string | null;
  translated_title?: string | null;
  translated_description?: string | null;
  is_translated: boolean;
}

export interface CommunityPlaceSuggestion {
  name: string;
  subtitle: string;
  source_url: string;
  latitude: number;
  longitude: number;
  short_description?: string | null;
  image_url?: string | null;
  reference_url?: string | null;
}

export interface CommunitySelectedPlaceInput {
  name: string;
  subtitle: string;
  source_url: string;
  latitude?: number | null;
  longitude?: number | null;
  short_description?: string | null;
  image_url?: string | null;
  reference_url?: string | null;
}

export interface CommunityRecommendationFeedContext {
  strategy_id: string;
  strategy_version: string;
  feed_request_id: string;
  position: number;
  slot_type: 'need_first' | 'adjacent_exploration' | 'curiosity_window';
  rank_score?: number | null;
  explanation_tags: Array<
    'city_match' | 'identity_match' | 'odyssey_relevance' | 'local_curiosity' | 'trust_boost' | 'freshness' | 'drift_caught'
  >;
}

export interface CommunityRecommendationContentContext {
  post_type: CommunityPost['post_type'];
  odyssey_slug?: string | null;
  verification_status: 'unverified' | 'community' | 'source_attached' | 'verified' | 'stale' | 'conflicting';
  reliability_score_band: 'low' | 'medium' | 'high' | string;
  has_source_url: boolean;
  has_media: boolean;
  author_city_match: boolean;
  author_identity_match: boolean;
}

export interface CommunityAuthor {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  city: string | null;
  identity: string;
  /** Account badge (D-063) — not the same as a source's verification_status. */
  is_verified?: boolean;
  /** 'human' | 'official' (D-065). Official = published by Postervia, not a
   *  person. A different claim from is_verified; never render them as one. */
  account_kind?: string;
  viewer_is_following?: boolean;
}

export interface CommunityCommentReactionEntry {
  emoji: string;
  count: number;
}

export interface CommunityComment {
  id: string;
  body: string;
  source_language: string;
  translated_body?: string | null;
  is_translated: boolean;
  moderation_status: 'approved' | 'pending' | 'review' | 'rejected';
  created_at: string;
  updated_at: string;
  author: CommunityAuthor;
  parent_comment_id?: string | null;
  reply_to_user_id?: string | null;
  reply_to_user_name?: string | null;
  helpful_count: number;
  viewer_marked_helpful: boolean;
  reply_count: number;
  viewer_reaction?: string | null;
  reaction_summary: CommunityCommentReactionEntry[];
  /** Client-only: true while the optimistic insert is still waiting on the server round-trip. */
  _pending?: boolean;
}

export interface CommunityPost {
  id: string;
  post_type: 'experience' | 'question' | 'guide' | 'warning' | 'recommendation';
  title: string;
  body: string;
  city?: string | null;
  identity_scope: 'all' | 'newcomer' | 'resident' | 'traveler' | 'local';
  odyssey_slug?: string | null;
  language: string;
  source_language: string;
  title_source_language: string;
  body_source_language: string;
  extracted_summary_source_language?: string | null;
  source_url?: string | null;
  extracted_summary?: string | null;
  ai_summary_enabled?: boolean;
  ai_enrichment_status?: 'pending' | 'generated' | 'skipped_short' | 'disabled';
  translated_title?: string | null;
  translated_body?: string | null;
  translated_extracted_summary?: string | null;
  is_translated: boolean;
  moderation_status: 'approved' | 'pending' | 'review' | 'rejected';
  visibility: 'public' | 'private';
  helpful_count: number;
  save_count: number;
  comment_count: number;
  action_task_count?: number;
  add_to_odyssey_count: number;
  created_at: string;
  viewer_marked_helpful: boolean;
  viewer_saved?: boolean;
  viewer_commented_excerpt?: string | null;
  author: CommunityAuthor;
  media_items: CommunityPostMedia[];
  action_candidates: CommunityActionCandidate[];
  feed_context?: CommunityRecommendationFeedContext | null;
  content_context?: CommunityRecommendationContentContext | null;
  /** Capability token for the public share URL postervia.app/p/{id}?s=… (D-040). */
  share_token?: string | null;
}

export interface PersonalOdyssey {
  id: string;
  source_post_id?: string | null;
  source_action_candidate_id?: string | null;
  source_group_event_id?: string | null;
  linked_odyssey_slug?: string | null;
  title: string;
  description?: string | null;
  metadata_json?: Record<string, unknown> | null;
  source_language: string;
  title_source_language: string;
  description_source_language?: string | null;
  translated_title?: string | null;
  translated_description?: string | null;
  is_translated: boolean;
  status: 'available' | 'in_progress' | 'done';
  origin: string;
  source_url?: string | null;
  verification_status: 'unverified' | 'community' | 'source_attached' | 'verified' | 'stale' | 'conflicting';
  reliability_score: number;
  last_verified_at?: string | null;
  next_verify_at?: string | null;
  source_changed_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export type PersonalTask = PersonalOdyssey;

export interface CommunityPostCreateInput {
  post_type: CommunityPost['post_type'];
  title: string;
  body: string;
  city?: string | null;
  identity_scope?: CommunityPost['identity_scope'];
  odyssey_slug?: string | null;
  source_url?: string | null;
  selected_places?: CommunitySelectedPlaceInput[];
  // When true and `selected_places` non-empty, the server creates one
  // UserPersonalOdyssey row per tagged place in the author's odyssey list.
  // Composer toggle: "Save these locations as Odyssey tasks".
  save_places_as_odysseys?: boolean;
  // Composer toggle "AI summary" (D-045). Omitted → enabled on the server.
  ai_summary_enabled?: boolean;
  media_items?: Array<
    Pick<CommunityPostMedia, 'media_url' | 'mime_type'> &
      Partial<Pick<CommunityPostMedia, 'thumb_url' | 'duration_seconds'>>
  >;
  // D-033 video posts: client-extracted sample frames for async moderation.
  moderation_frame_urls?: string[];
  visibility?: 'public' | 'private';
}

export interface CommunityPostUpdateInput extends CommunityPostCreateInput {}

export interface CommunityPlaceCardPreviewInput {
  post_type: CommunityPost['post_type'];
  title: string;
  body: string;
  city?: string | null;
}

export interface CommunityRecommendationEventInput {
  event_name:
    | 'plaza_impression'
    | 'plaza_card_visible'
    | 'plaza_open_post'
    | 'plaza_dwell'
    | 'plaza_expand_comments'
    | 'plaza_open_source_link'
    | 'plaza_hide_post'
    | 'plaza_report_post'
    | 'plaza_report_comment';
  session_id: string;
  surface: 'plaza_feed' | 'plaza_detail' | 'odyssey_from_plaza';
  post_id?: string | null;
  comment_id?: string | null;
  odyssey_id?: string | null;
  action_candidate_id?: string | null;
  feed_context?: CommunityRecommendationFeedContext | null;
  content_context?: CommunityRecommendationContentContext | null;
  dwell_ms?: number | null;
  had_downstream_signal_in_session?: boolean | null;
  metadata_json?: Record<string, unknown> | null;
}

function createUuidV4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

let communitySessionId = createUuidV4();

export function getCommunitySessionId() {
  return communitySessionId;
}

export interface CommunityFeedPage {
  items: CommunityPost[];
  next_cursor: string | null;
  // First page only: viewer has a city but nothing served is from it (D-061).
  local_pool_empty?: boolean;
}

export interface CommunitySearchOfficialHit {
  slug: string;
  title: string;
  node_type: string;
  city_scope?: string | null;
}

export interface CommunitySearchPage {
  items: CommunityPost[];
  next_cursor: string | null;
  total: number;
  query_language: string;
  used_translation: boolean;
  official_hit: CommunitySearchOfficialHit | null;
}

export interface CommunitySearchParams {
  q: string;
  postType: CommunityPost['post_type'] | null;
  cityScope: 'mine' | 'all';
  timeRange: 'all' | 'week' | 'month' | 'half_year';
  sort: 'relevance' | 'recent';
}

type CommunityFeedUser = {
  id?: string | null;
  city?: string | null;
  identity?: string | null;
  intent_tags?: string[] | null;
};

export function communityFeedQueryKey(
  user: CommunityFeedUser | null | undefined,
  langCode: string,
) {
  return [
    'community',
    'feed',
    user?.id,
    user?.city,
    user?.identity,
    user?.intent_tags?.join('|') ?? '',
    langCode,
  ] as const;
}

export function useCommunityFeed() {
  const { langCode } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const queryKey = communityFeedQueryKey(user, langCode);
  // Reopening the app after a real absence asks the backend for a new feed
  // session, which is what makes the D-062 variety visible at all.
  useFeedForegroundRefresh(queryKey, Boolean(user));
  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }): Promise<CommunityFeedPage> => {
      const res = await api.get('/community/feed', {
        params: {
          city: user?.city,
          identity: user?.identity,
          cursor: pageParam ?? undefined,
        },
      });
      return {
        items: res.data.data.items as CommunityPost[],
        next_cursor: (res.data.data.next_cursor ?? null) as string | null,
        local_pool_empty: Boolean(res.data.data.local_pool_empty),
      };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: Boolean(user),
    retry: 1,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  });
}

export function useSearchCommunityPosts(params: CommunitySearchParams | null) {
  const { langCode } = useLanguage();
  const user = useAuthStore((state) => state.user);
  return useInfiniteQuery({
    queryKey: [
      'community',
      'search',
      user?.id,
      langCode,
      params?.q ?? '',
      params?.postType ?? 'any',
      params?.cityScope ?? 'mine',
      params?.timeRange ?? 'all',
      params?.sort ?? 'relevance',
    ],
    queryFn: async ({ pageParam }): Promise<CommunitySearchPage> => {
      const res = await api.get('/community/posts/search', {
        params: {
          q: params?.q,
          post_type: params?.postType ?? undefined,
          city_scope: params?.cityScope ?? 'mine',
          time_range: params?.timeRange ?? 'all',
          sort: params?.sort ?? 'relevance',
          cursor: pageParam ?? undefined,
        },
      });
      const data = res.data.data;
      return {
        items: (data.items ?? []) as CommunityPost[],
        next_cursor: (data.next_cursor ?? null) as string | null,
        total: (data.total ?? 0) as number,
        query_language: (data.query_language ?? 'und') as string,
        used_translation: Boolean(data.used_translation),
        official_hit: (data.official_hit ?? null) as CommunitySearchOfficialHit | null,
      };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: Boolean(user) && Boolean(params && params.q.trim().length >= 2),
    retry: 1,
    staleTime: 30_000,
  });
}

// Trending search terms for the Discover board. The server returns an empty
// list until enough different people searched the same thing, and the screen
// hides the section in that case — no invented suggestions.
export function useSearchDiscover(enabled = true) {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['community', 'search-discover', user?.id, user?.city ?? 'no-city'],
    queryFn: async () => {
      const res = await api.get('/community/search-discover');
      return (res.data.data.items ?? []) as string[];
    },
    enabled: Boolean(user) && enabled,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function useMyCommunityPosts(limit = 30) {
  const { langCode } = useLanguage();
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['community', 'me', 'posts', user?.id, limit, langCode],
    queryFn: async () => {
      const res = await api.get('/community/me/posts', {
        params: { limit },
      });
      return res.data.data.items as CommunityPost[];
    },
    enabled: Boolean(user),
    retry: 1,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    staleTime: 30_000,
  });
}

export function useCommunityPost(postId?: string | null, enabled = true) {
  const { langCode } = useLanguage();
  return useQuery({
    queryKey: ['community', 'post', postId, langCode],
    queryFn: async () => {
      const res = await api.get(`/community/posts/${postId}`);
      return res.data.data as CommunityPost;
    },
    enabled: enabled && Boolean(postId),
    staleTime: 30_000,
  });
}

export function useCreateCommunityPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CommunityPostCreateInput) => {
      const res = await api.post('/community/posts', input, {
        timeout: COMMUNITY_POST_WRITE_TIMEOUT_MS,
      });
      return res.data.data as CommunityPost;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'feed'] });
      qc.invalidateQueries({ queryKey: ['community', 'me', 'posts'] });
    },
  });
}

export function useUpdatePostVisibility() {
  const qc = useQueryClient();
  const { langCode } = useLanguage();
  return useMutation({
    mutationFn: async ({
      postId,
      visibility,
    }: {
      postId: string;
      visibility: 'public' | 'private';
    }) => {
      const res = await api.patch(`/community/posts/${postId}/visibility`, { visibility });
      return res.data.data as CommunityPost;
    },
    onSuccess: (data) => {
      // Update detail query so the open detail modal reflects the new visibility immediately.
      qc.setQueryData<CommunityPost>(
        ['community', 'post', data.id, langCode],
        () => data,
      );
      // Patch every "my posts" cache entry so the Profile tabs split correctly.
      qc.setQueriesData<CommunityPost[]>(
        { queryKey: ['community', 'me', 'posts'] },
        (old) => {
          if (!old) return old;
          return old.map((post) => (post.id === data.id ? { ...post, visibility: data.visibility } : post));
        },
      );
      // Plaza feed: if now private, drop from all loaded pages so the user
      // doesn't keep seeing a post that's no longer public.
      if (data.visibility === 'private') {
        qc.setQueriesData<InfiniteData<CommunityFeedPage>>(
          { queryKey: ['community', 'feed'] },
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                items: page.items.filter((item) => item.id !== data.id),
              })),
            };
          },
        );
      }
    },
  });
}

export function useDeleteCommunityPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await api.delete(`/community/posts/${postId}`);
      return res.data.data as { post_id: string };
    },
    onSuccess: (data) => {
      // Drop the deleted post from every loaded feed page (Plaza & elsewhere) so
      // the user does not have to wait for a refetch to see it disappear.
      qc.setQueriesData<InfiniteData<CommunityFeedPage>>(
        { queryKey: ['community', 'feed'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => item.id !== data.post_id),
            })),
          };
        },
      );
      qc.setQueriesData<CommunityPost[]>(
        { queryKey: ['community', 'me', 'posts'] },
        (old) => {
          if (!old) return old;
          return old.filter((post) => post.id !== data.post_id);
        },
      );
      // Detail cache already patched by patchPostInFeedCaches — no refetch needed.
      qc.invalidateQueries({ queryKey: ['community', 'me', 'liked'] });
      qc.invalidateQueries({ queryKey: ['community', 'me', 'saved'] });
    },
  });
}

/**
 * Hide a post from the current user's feed (per-user hard filter).
 *
 * The backend writes a `user_hidden_posts` row and the feed query then
 * filters by it permanently — distinct from the `plaza_hide_post`
 * recommendation event which only nudged ranker weights and didn't
 * actually prevent the post from coming back.
 */
export function useHidePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      await api.post(`/community/posts/${postId}/hide`);
      return { postId };
    },
    onSuccess: ({ postId }) => {
      // Evict from every loaded feed page so it vanishes without waiting on refetch.
      qc.setQueriesData<InfiniteData<CommunityFeedPage>>(
        { queryKey: ['community', 'feed'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => item.id !== postId),
            })),
          };
        },
      );
    },
  });
}

export function useUpdateCommunityPost(postId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CommunityPostUpdateInput) => {
      const res = await api.patch(`/community/posts/${postId}`, input, {
        timeout: COMMUNITY_POST_WRITE_TIMEOUT_MS,
      });
      return res.data.data as CommunityPost;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'feed'] });
      qc.invalidateQueries({ queryKey: ['community', 'me', 'posts'] });
      qc.invalidateQueries({ queryKey: ['community', 'post', postId] });
    },
  });
}

export function useUploadCommunityMedia() {
  return useMutation({
    mutationFn: async ({ uri, mimeType, fileName }: { uri: string; mimeType: string; fileName: string }) => {
      const form = new FormData();
      form.append('file', { uri, name: fileName, type: mimeType } as any);
      const res = await api.post('/community/media/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // MS-16: multipart uploads need far more than the 10s global default —
        // even a compressed image on a weak network can take tens of seconds.
        timeout: 60000,
      });
      return res.data.data as CommunityPostMedia;
    },
  });
}

export function usePlaceSuggestions(query: string, enabled = true) {
  const { langCode } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['community', 'place-suggestions', user?.id, user?.city, trimmed, langCode],
    queryFn: async () => {
      const res = await api.get('/community/place-suggestions', {
        params: {
          query: trimmed,
          city: user?.city,
        },
      });
      return res.data.data.items as CommunityPlaceSuggestion[];
    },
    enabled: enabled && Boolean(user) && trimmed.length >= 2,
    staleTime: 60_000,
  });
}

export function usePlaceCardPreview(input: CommunityPlaceCardPreviewInput, enabled = true) {
  const { langCode } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const title = input.title.trim();
  const body = input.body.trim();
  const city = input.city?.trim() ?? user?.city ?? '';

  return useQuery({
    queryKey: ['community', 'place-card-preview', user?.id, input.post_type, city, title, body, langCode],
    queryFn: async () => {
      const res = await api.post('/community/place-card-preview', {
        post_type: input.post_type,
        title,
        body,
        city: city || undefined,
      });
      return (res.data.data as CommunityPlaceSuggestion | null) ?? null;
    },
    enabled: enabled && Boolean(user) && (title.length >= 2 || body.length >= 12),
    staleTime: 30_000,
  });
}

export function useCommunityComments(postId: string, enabled = true) {
  const { langCode } = useLanguage();
  return useQuery({
    queryKey: ['community', 'comments', postId, langCode],
    queryFn: async () => {
      const res = await api.get(`/community/posts/${postId}/comments`);
      return res.data.data.items as CommunityComment[];
    },
    enabled,
  });
}

export interface CreateCommentInput {
  body: string;
  parent_comment_id?: string | null;
  reply_to_user_id?: string | null;
  reply_to_user_name?: string | null;
}

export function useCreateCommunityComment(postId: string) {
  const qc = useQueryClient();
  const { langCode } = useLanguage();
  return useMutation({
    mutationFn: async (input: string | CreateCommentInput) => {
      const payload = typeof input === 'string' ? { body: input } : input;
      const res = await api.post(`/community/posts/${postId}/comments`, payload);
      return res.data.data as CommunityComment;
    },
    // MS-16: don't make the composer wait on the network round-trip — insert a
    // local placeholder the instant the user hits send, so a flaky connection
    // doesn't read as "stuck". onError rolls the placeholder back.
    onMutate: async (input) => {
      const user = useAuthStore.getState().user;
      if (!user) return undefined;
      const payload = typeof input === 'string' ? { body: input } : input;
      const parentCommentId = payload.parent_comment_id ?? null;
      const isReply = Boolean(parentCommentId);
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const now = new Date().toISOString();
      const optimisticComment: CommunityComment = {
        id: tempId,
        body: payload.body,
        source_language: langCode,
        translated_body: null,
        is_translated: false,
        moderation_status: 'approved',
        created_at: now,
        updated_at: now,
        author: {
          id: user.id,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          city: user.city,
          identity: user.identity,
        },
        parent_comment_id: parentCommentId,
        reply_to_user_id: payload.reply_to_user_id ?? null,
        reply_to_user_name: payload.reply_to_user_name ?? null,
        helpful_count: 0,
        viewer_marked_helpful: false,
        reply_count: 0,
        viewer_reaction: null,
        reaction_summary: [],
        _pending: true,
      };

      const topKey = ['community', 'comments', postId, langCode];
      await qc.cancelQueries({ queryKey: topKey });
      if (!isReply) {
        qc.setQueryData<CommunityComment[]>(topKey, (old) =>
          old ? [...old, optimisticComment] : old,
        );
      }
      if (isReply) {
        const repliesKey = ['community', 'comments', postId, 'replies', parentCommentId, langCode];
        await qc.cancelQueries({ queryKey: repliesKey });
        qc.setQueryData<CommunityComment[]>(repliesKey, (old) =>
          old ? [...old, optimisticComment] : [optimisticComment],
        );
      }
      return { tempId, isReply, parentCommentId };
    },
    onError: (_err, _input, context) => {
      _bc('create_comment');
      if (!context) return;
      const topKey = ['community', 'comments', postId, langCode];
      qc.setQueryData<CommunityComment[]>(topKey, (old) =>
        old?.filter((c) => c.id !== context.tempId),
      );
      if (context.isReply && context.parentCommentId) {
        const repliesKey = [
          'community',
          'comments',
          postId,
          'replies',
          context.parentCommentId,
          langCode,
        ];
        qc.setQueryData<CommunityComment[]>(repliesKey, (old) =>
          old?.filter((c) => c.id !== context.tempId),
        );
      }
    },
    onSuccess: async (created, _input, context) => {
      // Top-level comment: replace the optimistic placeholder (or append if
      // onMutate skipped, e.g. no cached user yet). Reply: same, in the
      // replies cache.
      const isReply = Boolean(created.parent_comment_id);
      const topKey = ['community', 'comments', postId, langCode];
      if (!isReply) {
        qc.setQueryData<CommunityComment[]>(topKey, (old) => {
          if (!old) return old;
          if (context?.tempId && old.some((c) => c.id === context.tempId)) {
            return old.map((c) => (c.id === context.tempId ? created : c));
          }
          return [...old, created];
        });
      }
      if (isReply) {
        const repliesKey = [
          'community',
          'comments',
          postId,
          'replies',
          created.parent_comment_id,
          langCode,
        ];
        qc.setQueryData<CommunityComment[]>(repliesKey, (old) => {
          if (!old) return [created];
          if (context?.tempId && old.some((c) => c.id === context.tempId)) {
            return old.map((c) => (c.id === context.tempId ? created : c));
          }
          return [...old, created];
        });
        // Bump reply_count on the parent comment in the top-level cache.
        qc.setQueryData<CommunityComment[]>(topKey, (old) => {
          if (!old) return old;
          return old.map((c) =>
            c.id === created.parent_comment_id
              ? { ...c, reply_count: (c.reply_count ?? 0) + 1 }
              : c,
          );
        });
      }
      // Bump comment_count on the post in feed and detail caches.
      patchPostInFeedCaches(qc, postId, (post) => ({
        ...post,
        comment_count: post.comment_count + 1,
      }));
      qc.setQueryData<CommunityPost>(['community', 'post', postId, langCode], (old) => {
        if (!old) return old;
        return { ...old, comment_count: old.comment_count + 1 };
      });
      // Invalidate me/posts so Profile → Comments tab refreshes.
      await qc.invalidateQueries({ queryKey: ['community', 'me', 'commented'] });
    },
  });
}

export function useCommunityCommentReplies(postId: string, commentId: string | null, enabled = true) {
  const { langCode } = useLanguage();
  return useQuery({
    queryKey: ['community', 'comments', postId, 'replies', commentId, langCode],
    queryFn: async () => {
      const res = await api.get(`/community/posts/${postId}/comments/${commentId}/replies`);
      return res.data.data.items as CommunityComment[];
    },
    enabled: enabled && Boolean(commentId),
  });
}

function patchCommentInCaches(
  qc: ReturnType<typeof useQueryClient>,
  postId: string,
  commentId: string,
  patch: (comment: CommunityComment) => CommunityComment,
  langCode?: string,
) {
  if (langCode) {
    qc.setQueriesData<CommunityComment[]>(
      {
        predicate: (query) => {
          const key = query.queryKey;
          return (
            key[0] === 'community' &&
            key[1] === 'comments' &&
            key[2] === postId &&
            key[key.length - 1] === langCode
          );
        },
      },
      (old) => (old ? old.map((c) => (c.id === commentId ? patch(c) : c)) : old),
    );
    return;
  }

  qc.setQueriesData<CommunityComment[]>(
    { queryKey: ['community', 'comments', postId] },
    (old) => (old ? old.map((c) => (c.id === commentId ? patch(c) : c)) : old),
  );
  // Replies caches: patch wherever the comment shows up under any parent.
  qc.setQueriesData<CommunityComment[]>(
    { queryKey: ['community', 'comments', postId, 'replies'] },
    (old) => (old ? old.map((c) => (c.id === commentId ? patch(c) : c)) : old),
  );
}

export function useEditComment(postId: string) {
  const qc = useQueryClient();
  const { langCode } = useLanguage();
  return useMutation({
    mutationFn: async (input: { commentId: string; body: string }) => {
      const res = await api.patch(`/community/comments/${input.commentId}`, { body: input.body });
      return res.data.data as CommunityComment;
    },
    onSuccess: (updated) => {
      patchCommentInCaches(qc, postId, updated.id, () => updated, langCode);
    },
  });
}

export function useDeleteComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await api.delete(`/community/comments/${commentId}`);
      return res.data.data as { comment_id: string };
    },
    onSuccess: (data) => {
      // Remove from top-level cache.
      qc.setQueriesData<CommunityComment[]>(
        { queryKey: ['community', 'comments', postId] },
        (old) => (old ? old.filter((c) => c.id !== data.comment_id) : old),
      );
      // Remove from any replies cache.
      qc.setQueriesData<CommunityComment[]>(
        { queryKey: ['community', 'comments', postId, 'replies'] },
        (old) => (old ? old.filter((c) => c.id !== data.comment_id) : old),
      );
      // Decrement post.comment_count.
      patchPostInFeedCaches(qc, postId, (post) => ({
        ...post,
        comment_count: Math.max(0, post.comment_count - 1),
      }));
      qc.setQueriesData<CommunityPost>({ queryKey: ['community', 'post', postId] }, (old) => {
        if (!old) return old;
        return { ...old, comment_count: Math.max(0, old.comment_count - 1) };
      });
    },
  });
}

export function useMarkCommentHelpful(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await api.post(`/community/comments/${commentId}/helpful`);
      return res.data.data as { comment_id: string; helpful_count: number; viewer_marked_helpful: boolean };
    },
    onMutate: async (commentId) => {
      const snapshot = await snapshotAndCancelCommentCaches(qc, postId);
      patchCommentInCaches(qc, postId, commentId, (c) =>
        c.viewer_marked_helpful
          ? c
          : { ...c, viewer_marked_helpful: true, helpful_count: c.helpful_count + 1 },
      );
      return { snapshot };
    },
    onError: (_err, _commentId, context) => {
      _bc('mark_comment_helpful');
      restoreSnapshots(qc, context?.snapshot);
    },
    onSettled: (data) => {
      if (data) {
        patchCommentInCaches(qc, postId, data.comment_id, (c) => ({
          ...c,
          viewer_marked_helpful: data.viewer_marked_helpful,
          helpful_count: data.helpful_count,
        }));
      }
    },
  });
}

export function useUnmarkCommentHelpful(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await api.delete(`/community/comments/${commentId}/helpful`);
      return res.data.data as { comment_id: string; helpful_count: number; viewer_marked_helpful: boolean };
    },
    onMutate: async (commentId) => {
      const snapshot = await snapshotAndCancelCommentCaches(qc, postId);
      patchCommentInCaches(qc, postId, commentId, (c) =>
        c.viewer_marked_helpful
          ? { ...c, viewer_marked_helpful: false, helpful_count: Math.max(0, c.helpful_count - 1) }
          : c,
      );
      return { snapshot };
    },
    onError: (_err, _commentId, context) => {
      _bc('unmark_comment_helpful');
      restoreSnapshots(qc, context?.snapshot);
    },
    onSettled: (data) => {
      if (data) {
        patchCommentInCaches(qc, postId, data.comment_id, (c) => ({
          ...c,
          viewer_marked_helpful: false,
          helpful_count: data.helpful_count,
        }));
      }
    },
  });
}

function applyOptimisticReaction(
  comment: CommunityComment,
  nextEmoji: string | null,
): CommunityComment {
  const previousEmoji = comment.viewer_reaction;
  if (previousEmoji === nextEmoji) return comment;
  let summary: CommunityCommentReactionEntry[] = comment.reaction_summary.map((entry) =>
    previousEmoji && entry.emoji === previousEmoji
      ? { ...entry, count: Math.max(0, entry.count - 1) }
      : entry,
  );
  summary = summary.filter((entry) => entry.count > 0);
  if (nextEmoji) {
    const existing = summary.find((entry) => entry.emoji === nextEmoji);
    summary = existing
      ? summary.map((entry) =>
          entry.emoji === nextEmoji ? { ...entry, count: entry.count + 1 } : entry,
        )
      : [...summary, { emoji: nextEmoji, count: 1 }];
  }
  return { ...comment, viewer_reaction: nextEmoji, reaction_summary: summary };
}

export function useSetCommentReaction(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { commentId: string; emoji: string }) => {
      const res = await api.post(`/community/comments/${input.commentId}/reaction`, {
        emoji: input.emoji,
      });
      return res.data.data as {
        comment_id: string;
        viewer_reaction: string | null;
        reaction_summary: CommunityCommentReactionEntry[];
      };
    },
    onMutate: async ({ commentId, emoji }) => {
      const snapshot = await snapshotAndCancelCommentCaches(qc, postId);
      patchCommentInCaches(qc, postId, commentId, (c) => applyOptimisticReaction(c, emoji));
      return { snapshot };
    },
    onError: (_err, _input, context) => {
      _bc('set_comment_reaction');
      restoreSnapshots(qc, context?.snapshot);
    },
    onSettled: (data) => {
      if (data) {
        patchCommentInCaches(qc, postId, data.comment_id, (c) => ({
          ...c,
          viewer_reaction: data.viewer_reaction,
          reaction_summary: data.reaction_summary,
        }));
      }
    },
  });
}

export function useRemoveCommentReaction(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await api.delete(`/community/comments/${commentId}/reaction`);
      return res.data.data as {
        comment_id: string;
        viewer_reaction: string | null;
        reaction_summary: CommunityCommentReactionEntry[];
      };
    },
    onMutate: async (commentId) => {
      const snapshot = await snapshotAndCancelCommentCaches(qc, postId);
      patchCommentInCaches(qc, postId, commentId, (c) => applyOptimisticReaction(c, null));
      return { snapshot };
    },
    onError: (_err, _commentId, context) => {
      _bc('remove_comment_reaction');
      restoreSnapshots(qc, context?.snapshot);
    },
    onSettled: (data) => {
      if (data) {
        patchCommentInCaches(qc, postId, data.comment_id, (c) => ({
          ...c,
          viewer_reaction: null,
          reaction_summary: data.reaction_summary,
        }));
      }
    },
  });
}

export type NotificationCategory = 'social' | 'buddy';

export interface CommunityNotification {
  id: string;
  type: 'follow' | 'comment_reply' | 'comment_mention' | 'buddy_chat_started' | 'friend_request';
  actor: CommunityAuthor;
  post_id?: string | null;
  comment_id?: string | null;
  comment_excerpt?: string | null;
  post_title?: string | null;
  created_at: string;
  read_at?: string | null;
}

export interface CommunityNotificationList {
  items: CommunityNotification[];
  unread_count: number;
}

export function useNotifications(enabled = true, category?: NotificationCategory) {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['community', 'notifications', user?.id, category ?? 'all'],
    queryFn: async () => {
      const res = await api.get('/community/notifications', {
        params: category ? { limit: 30, category } : { limit: 30 },
      });
      return res.data.data as CommunityNotificationList;
    },
    enabled: enabled && Boolean(user),
    refetchInterval: 30_000,
  });
}

export function useMarkAllNotificationsRead(category?: NotificationCategory) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post(
        '/community/notifications/read-all',
        undefined,
        { params: category ? { category } : undefined },
      );
      return res.data.data as { marked_read: number };
    },
    onSuccess: () => {
      qc.setQueriesData<CommunityNotificationList>(
        { queryKey: ['community', 'notifications'] },
        (old) => {
          if (!old) return old;
          const now = new Date().toISOString();
          return {
            unread_count: 0,
            items: old.items.map((n) => (n.read_at ? n : { ...n, read_at: now })),
          };
        },
      );
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await api.post(`/community/notifications/${notificationId}/read`);
      return res.data.data as { notification_id: string };
    },
    onSuccess: (data) => {
      qc.setQueriesData<CommunityNotificationList>(
        { queryKey: ['community', 'notifications'] },
        (old) => {
          if (!old) return old;
          const now = new Date().toISOString();
          let unreadDelta = 0;
          const items = old.items.map((n) => {
            if (n.id !== data.notification_id) return n;
            if (n.read_at) return n;
            unreadDelta = 1;
            return { ...n, read_at: now };
          });
          return { items, unread_count: Math.max(0, old.unread_count - unreadDelta) };
        },
      );
    },
  });
}

export interface UserProfile {
  id: string;
  display_id?: string | null;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  origin_city: string | null;
  identity: string;
  intent_tags: string[];
  bio: string | null;
  /** Account badge (D-063) — not the same as a source's verification_status. */
  is_verified?: boolean;
  /** 'human' | 'official' (D-065). Official = published by Postervia, not a
   *  person. A different claim from is_verified; never render them as one. */
  account_kind?: string;
  created_at: string;
  follower_count: number;
  following_count: number;
  post_count: number;
  helpful_received_count: number;
  save_received_count: number;
  viewer_is_following: boolean;
  viewer_is_self: boolean;
  relationship_state: 'none' | 'outgoing_pending' | 'incoming_pending' | 'friends';
  relationship_id?: string | null;
  restricted?: boolean;
  profile_visibility?: 'public' | 'followers' | 'friends' | 'only_me';
  tab_notes_public: boolean;
  tab_comments_public: boolean;
  tab_saves_public: boolean;
  tab_likes_public: boolean;
}

export function useUserProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['community', 'user-profile', userId],
    queryFn: async () => {
      const res = await api.get(`/community/users/${userId}/profile`);
      return res.data.data as UserProfile;
    },
    enabled: Boolean(userId),
  });
}

export function useUserPosts(userId: string | null | undefined) {
  const { langCode } = useLanguage();
  return useQuery({
    queryKey: ['community', 'user-posts', userId, langCode],
    queryFn: async () => {
      const res = await api.get(`/community/users/${userId}/posts`, { params: { limit: 30 } });
      return res.data.data.items as CommunityPost[];
    },
    enabled: Boolean(userId),
  });
}

function patchFollowInCaches(
  qc: QueryClient,
  userId: string,
  viewerIsFollowing: boolean,
  followerDelta: -1 | 0 | 1,
) {
  const apply = (author: CommunityAuthor): CommunityAuthor =>
    author.id === userId ? { ...author, viewer_is_following: viewerIsFollowing } : author;
  qc.setQueriesData<InfiniteData<CommunityFeedPage>>(
    { queryKey: ['community', 'feed'] },
    (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((post) => ({ ...post, author: apply(post.author) })),
            })),
          }
        : old,
  );
  qc.setQueriesData<CommunityPost>({ queryKey: ['community', 'post'] }, (old) =>
    old ? { ...old, author: apply(old.author) } : old,
  );
  qc.setQueriesData<UserProfile>(
    { queryKey: ['community', 'user-profile', userId] },
    (old) => {
      if (!old) return old;
      const nextFollowerCount =
        followerDelta === 0
          ? old.follower_count
          : Math.max(0, old.follower_count + followerDelta);
      return {
        ...old,
        viewer_is_following: viewerIsFollowing,
        follower_count: nextFollowerCount,
      };
    },
  );
}

export function useFollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/community/users/${userId}/follow`);
      return res.data.data as { user_id: string; viewer_is_following: boolean };
    },
    onMutate: async (userId) => {
      const snapshot = await snapshotAndCancelFollowCaches(qc, userId);
      const profile = qc.getQueryData<UserProfile>(['community', 'user-profile', userId]);
      const wasFollowing = profile?.viewer_is_following ?? false;
      patchFollowInCaches(qc, userId, true, wasFollowing ? 0 : 1);
      return { snapshot };
    },
    onError: (_err, _userId, context) => {
      _bc('follow_user');
      restoreSnapshots(qc, context?.snapshot);
    },
    onSettled: (data) => {
      if (data) {
        // Server confirmed — final follower_count delta is best-effort because the API
        // doesn't return it; rely on the optimistic value already in cache, which is
        // accurate when we transitioned from not-following → following exactly once.
        patchFollowInCaches(qc, data.user_id, data.viewer_is_following, 0);
      }
    },
  });
}

export function useUnfollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.delete(`/community/users/${userId}/follow`);
      return res.data.data as { user_id: string; viewer_is_following: boolean };
    },
    onMutate: async (userId) => {
      const snapshot = await snapshotAndCancelFollowCaches(qc, userId);
      const profile = qc.getQueryData<UserProfile>(['community', 'user-profile', userId]);
      const wasFollowing = profile?.viewer_is_following ?? true;
      patchFollowInCaches(qc, userId, false, wasFollowing ? -1 : 0);
      return { snapshot };
    },
    onError: (_err, _userId, context) => {
      _bc('unfollow_user');
      restoreSnapshots(qc, context?.snapshot);
    },
    onSettled: (data) => {
      if (data) {
        patchFollowInCaches(qc, data.user_id, false, 0);
      }
    },
  });
}

// Optimistic-update helpers. Each mutation that flips a viewer-facing flag
// (helpful / save / follow / reaction) calls these in `onMutate` so the UI
// reacts in the same frame as the tap, then rolls back via `onError` and
// reconciles with the server's authoritative count in `onSettled`.
type Snapshot = ReadonlyArray<readonly [QueryKey, unknown]>;

async function snapshotAndCancelPostCaches(qc: QueryClient, postId: string): Promise<Snapshot> {
  await Promise.all([
    qc.cancelQueries({ queryKey: ['community', 'feed'] }),
    qc.cancelQueries({ queryKey: ['community', 'me', 'posts'] }),
    qc.cancelQueries({ queryKey: ['community', 'post', postId] }),
  ]);
  return [
    ...qc.getQueriesData({ queryKey: ['community', 'feed'] }),
    ...qc.getQueriesData({ queryKey: ['community', 'me', 'posts'] }),
    ...qc.getQueriesData({ queryKey: ['community', 'post', postId] }),
  ];
}

async function snapshotAndCancelCommentCaches(qc: QueryClient, postId: string): Promise<Snapshot> {
  await qc.cancelQueries({ queryKey: ['community', 'comments', postId] });
  return qc.getQueriesData({ queryKey: ['community', 'comments', postId] });
}

async function snapshotAndCancelFollowCaches(qc: QueryClient, userId: string): Promise<Snapshot> {
  await Promise.all([
    qc.cancelQueries({ queryKey: ['community', 'feed'] }),
    qc.cancelQueries({ queryKey: ['community', 'post'] }),
    qc.cancelQueries({ queryKey: ['community', 'user-profile', userId] }),
  ]);
  return [
    ...qc.getQueriesData({ queryKey: ['community', 'feed'] }),
    ...qc.getQueriesData({ queryKey: ['community', 'post'] }),
    ...qc.getQueriesData({ queryKey: ['community', 'user-profile', userId] }),
  ];
}

function restoreSnapshots(qc: QueryClient, snapshot: Snapshot | undefined) {
  if (!snapshot) return;
  snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
}

function patchPostInFeedCaches(
  qc: ReturnType<typeof useQueryClient>,
  postId: string,
  patch: (post: CommunityPost) => CommunityPost,
) {
  // Plaza feed is paginated (snapshot + cursor) — patch in place across all loaded pages
  // so the user's scroll position and ordering stay stable.
  qc.setQueriesData<InfiniteData<CommunityFeedPage>>(
    { queryKey: ['community', 'feed'] },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((post) => (post.id === postId ? patch(post) : post)),
        })),
      };
    },
  );
  // Profile "my posts" is a flat list — patch directly.
  qc.setQueriesData<CommunityPost[]>(
    { queryKey: ['community', 'me', 'posts'] },
    (old) => {
      if (!old) return old;
      return old.map((post) => (post.id === postId ? patch(post) : post));
    },
  );
  // Detail page (`useCommunityPost`) — patch the single-post cache so an open detail
  // modal flips its star/heart/count instantly without waiting for the slow
  // `GET /posts/{id}` refetch (which re-runs Wikipedia/geocode enrichment).
  qc.setQueriesData<CommunityPost>(
    { queryKey: ['community', 'post', postId] },
    (old) => (old ? patch(old) : old),
  );
}

export function useMarkCommunityHelpful() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await api.post(`/community/posts/${postId}/helpful`);
      return res.data.data as { post_id: string; helpful_count: number; viewer_marked_helpful: boolean };
    },
    onMutate: async (postId) => {
      const snapshot = await snapshotAndCancelPostCaches(qc, postId);
      patchPostInFeedCaches(qc, postId, (post) =>
        post.viewer_marked_helpful
          ? post
          : { ...post, viewer_marked_helpful: true, helpful_count: post.helpful_count + 1 },
      );
      return { snapshot };
    },
    onError: (_err, _postId, context) => {
      _bc('mark_community_helpful');
      restoreSnapshots(qc, context?.snapshot);
    },
    onSettled: (data) => {
      if (data) {
        patchPostInFeedCaches(qc, data.post_id, (post) => ({
          ...post,
          viewer_marked_helpful: data.viewer_marked_helpful,
          helpful_count: data.helpful_count,
        }));
      }
      qc.invalidateQueries({ queryKey: ['community', 'me', 'liked'] });
    },
  });
}

export function useAddActionToOdysseys() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (actionId: string) => {
      const res = await api.post(`/community/actions/${actionId}/add-to-odyssey`);
      return res.data.data as { odyssey: PersonalOdyssey; task?: PersonalOdyssey; created: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'post'] });
      qc.invalidateQueries({ queryKey: ['community', 'feed'] });
      qc.invalidateQueries({ queryKey: ['community', 'me', 'posts'] });
      qc.invalidateQueries({ queryKey: ['community', 'personal-odysseys'] });
    },
  });
}

export function useAddActionToTasks() {
  return useAddActionToOdysseys();
}

export function useRefreshActionVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (actionId: string) => {
      const res = await api.post(`/community/actions/${actionId}/refresh-verification`);
      return res.data.data as CommunityActionCandidate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'feed'] });
      qc.invalidateQueries({ queryKey: ['community', 'personal-odysseys'] });
    },
  });
}

export function usePersonalOdysseys() {
  const { langCode } = useLanguage();
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['community', 'personal-odysseys', user?.id, langCode],
    queryFn: async () => {
      const res = await api.get('/community/personal-odysseys');
      return res.data.data as PersonalOdyssey[];
    },
    enabled: Boolean(user),
  });
}

export function usePersonalTasks() {
  return usePersonalOdysseys();
}

export function useRefreshPersonalOdysseyVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await api.post(`/community/personal-odysseys/${taskId}/refresh-verification`);
      return res.data.data as PersonalOdyssey;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'personal-odysseys'] });
      qc.invalidateQueries({ queryKey: ['community', 'feed'] });
    },
  });
}

export function useRefreshPersonalTaskVerification() {
  return useRefreshPersonalOdysseyVerification();
}

export function useStartPersonalOdyssey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await api.post(`/community/personal-odysseys/${taskId}/start`);
      return res.data.data as PersonalOdyssey;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'personal-odysseys'] });
    },
  });
}

export function useStartPersonalTask() {
  return useStartPersonalOdyssey();
}

export function useCompletePersonalOdyssey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await api.post(`/community/personal-odysseys/${taskId}/complete`);
      return res.data.data as PersonalOdyssey;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'personal-odysseys'] });
    },
  });
}

export function useCompletePersonalTask() {
  return useCompletePersonalOdyssey();
}

export function useTrackCommunityEvents() {
  return useMutation({
    mutationFn: async (events: CommunityRecommendationEventInput[]) => {
      if (!events.length) {
        return { accepted: 0 };
      }
      const res = await api.post('/community/recommendation/events', { events });
      return res.data.data as { accepted: number };
    },
  });
}

export function useUnmarkCommunityHelpful() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await api.delete(`/community/posts/${postId}/helpful`);
      return res.data.data as { post_id: string; helpful_count: number; viewer_marked_helpful: boolean };
    },
    onMutate: async (postId) => {
      const snapshot = await snapshotAndCancelPostCaches(qc, postId);
      patchPostInFeedCaches(qc, postId, (post) =>
        post.viewer_marked_helpful
          ? { ...post, viewer_marked_helpful: false, helpful_count: Math.max(0, post.helpful_count - 1) }
          : post,
      );
      return { snapshot };
    },
    onError: (_err, _postId, context) => {
      _bc('unmark_community_helpful');
      restoreSnapshots(qc, context?.snapshot);
    },
    onSettled: (data) => {
      if (data) {
        patchPostInFeedCaches(qc, data.post_id, (post) => ({
          ...post,
          viewer_marked_helpful: false,
          helpful_count: data.helpful_count,
        }));
      }
      qc.invalidateQueries({ queryKey: ['community', 'me', 'liked'] });
    },
  });
}

export function useSaveCommunityPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await api.post(`/community/posts/${postId}/save`);
      return res.data.data as { post_id: string; save_count: number; viewer_saved: boolean };
    },
    onMutate: async (postId) => {
      const snapshot = await snapshotAndCancelPostCaches(qc, postId);
      patchPostInFeedCaches(qc, postId, (post) =>
        post.viewer_saved
          ? post
          : { ...post, viewer_saved: true, save_count: post.save_count + 1 },
      );
      return { snapshot };
    },
    onError: (_err, _postId, context) => {
      _bc('save_community_post');
      restoreSnapshots(qc, context?.snapshot);
    },
    onSettled: (data) => {
      if (data) {
        patchPostInFeedCaches(qc, data.post_id, (post) => ({
          ...post,
          viewer_saved: data.viewer_saved,
          save_count: data.save_count,
        }));
      }
      qc.invalidateQueries({ queryKey: ['community', 'me', 'saved'] });
    },
  });
}

export function useUnsaveCommunityPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await api.delete(`/community/posts/${postId}/save`);
      return res.data.data as { post_id: string; save_count: number; viewer_saved: boolean };
    },
    onMutate: async (postId) => {
      const snapshot = await snapshotAndCancelPostCaches(qc, postId);
      patchPostInFeedCaches(qc, postId, (post) =>
        post.viewer_saved
          ? { ...post, viewer_saved: false, save_count: Math.max(0, post.save_count - 1) }
          : post,
      );
      return { snapshot };
    },
    onError: (_err, _postId, context) => {
      _bc('unsave_community_post');
      restoreSnapshots(qc, context?.snapshot);
    },
    onSettled: (data) => {
      if (data) {
        patchPostInFeedCaches(qc, data.post_id, (post) => ({
          ...post,
          viewer_saved: false,
          save_count: data.save_count,
        }));
      }
      qc.invalidateQueries({ queryKey: ['community', 'me', 'saved'] });
    },
  });
}

export function useRecordPostView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      await api.post(`/community/posts/${postId}/view`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'me', 'viewed'] });
    },
  });
}

export function useClearViewHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete('/community/me/views');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'me', 'viewed'] });
    },
  });
}

export function useMyLikedPosts(enabled: boolean = true) {
  const { langCode } = useLanguage();
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['community', 'me', 'liked', user?.id, langCode],
    queryFn: async () => {
      const res = await api.get('/community/me/liked-posts');
      return (res.data.data as { items: CommunityPost[] }).items;
    },
    enabled: enabled && Boolean(user),
  });
}

export function useMySavedPosts(enabled: boolean = true) {
  const { langCode } = useLanguage();
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['community', 'me', 'saved', user?.id, langCode],
    queryFn: async () => {
      const res = await api.get('/community/me/saved-posts');
      return (res.data.data as { items: CommunityPost[] }).items;
    },
    enabled: enabled && Boolean(user),
  });
}

export function useMyViewedPosts(enabled: boolean = true) {
  const { langCode } = useLanguage();
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['community', 'me', 'viewed', user?.id, langCode],
    queryFn: async () => {
      const res = await api.get('/community/me/viewed-posts');
      return (res.data.data as { items: CommunityPost[] }).items;
    },
    enabled: enabled && Boolean(user),
  });
}

export function useMyCommentedPosts(enabled: boolean = true) {
  const { langCode } = useLanguage();
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['community', 'me', 'commented', user?.id, langCode],
    queryFn: async () => {
      const res = await api.get('/community/me/commented-posts');
      return (res.data.data as { items: CommunityPost[] }).items;
    },
    enabled: enabled && Boolean(user),
  });
}

export function useUserLikedPosts(userId: string | null | undefined, enabled: boolean = true) {
  const { langCode } = useLanguage();
  return useQuery({
    queryKey: ['community', 'user-liked', userId, langCode],
    queryFn: async () => {
      const res = await api.get(`/community/users/${userId}/liked-posts`);
      return (res.data.data as { items: CommunityPost[] }).items;
    },
    enabled: enabled && Boolean(userId),
  });
}

export function useUserSavedPosts(userId: string | null | undefined, enabled: boolean = true) {
  const { langCode } = useLanguage();
  return useQuery({
    queryKey: ['community', 'user-saved', userId, langCode],
    queryFn: async () => {
      const res = await api.get(`/community/users/${userId}/saved-posts`);
      return (res.data.data as { items: CommunityPost[] }).items;
    },
    enabled: enabled && Boolean(userId),
  });
}

export function useUserCommentedPosts(userId: string | null | undefined, enabled: boolean = true) {
  const { langCode } = useLanguage();
  return useQuery({
    queryKey: ['community', 'user-commented', userId, langCode],
    queryFn: async () => {
      const res = await api.get(`/community/users/${userId}/commented-posts`);
      return (res.data.data as { items: CommunityPost[] }).items;
    },
    enabled: enabled && Boolean(userId),
  });
}
