import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export interface CommunityPostMedia {
  id?: string | null;
  media_url: string;
  mime_type?: string | null;
  sort_order: number;
}

export interface CommunityActionCandidate {
  id: string;
  entity_type: string;
  entity_name?: string | null;
  action_type: string;
  title: string;
  description?: string | null;
  linked_task_slug?: string | null;
  source_url?: string | null;
  verification_status: 'unverified' | 'community' | 'source_attached' | 'verified' | 'stale' | 'conflicting';
  reliability_score: number;
  last_verified_at?: string | null;
  next_verify_at?: string | null;
  metadata_json?: Record<string, unknown> | null;
}

export interface CommunityRecommendationFeedContext {
  strategy_id: string;
  strategy_version: string;
  feed_request_id: string;
  position: number;
  slot_type: 'need_first' | 'adjacent_exploration' | 'curiosity_window';
  rank_score?: number | null;
  explanation_tags: Array<
    'city_match' | 'identity_match' | 'task_relevance' | 'local_curiosity' | 'trust_boost' | 'freshness' | 'drift_caught'
  >;
}

export interface CommunityRecommendationContentContext {
  post_type: CommunityPost['post_type'];
  task_slug?: string | null;
  verification_status: 'unverified' | 'community' | 'source_attached' | 'verified' | 'stale' | 'conflicting';
  reliability_score_band: 'low' | 'medium' | 'high' | string;
  has_source_url: boolean;
  has_media: boolean;
  author_city_match: boolean;
  author_identity_match: boolean;
}

export interface CommunityComment {
  id: string;
  body: string;
  moderation_status: 'approved' | 'review' | 'rejected';
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
    city: string;
    identity: string;
  };
}

export interface CommunityPost {
  id: string;
  post_type: 'experience' | 'question' | 'guide' | 'warning' | 'recommendation';
  title: string;
  body: string;
  city?: string | null;
  identity_scope: 'all' | 'newcomer' | 'resident' | 'traveler';
  task_slug?: string | null;
  language: string;
  source_url?: string | null;
  extracted_summary?: string | null;
  moderation_status: 'approved' | 'review' | 'rejected';
  helpful_count: number;
  save_count: number;
  comment_count: number;
  action_task_count: number;
  created_at: string;
  viewer_marked_helpful: boolean;
  author: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
    city: string;
    identity: string;
  };
  media_items: CommunityPostMedia[];
  action_candidates: CommunityActionCandidate[];
  feed_context?: CommunityRecommendationFeedContext | null;
  content_context?: CommunityRecommendationContentContext | null;
}

export interface PersonalTask {
  id: string;
  source_post_id?: string | null;
  source_action_candidate_id?: string | null;
  linked_task_slug?: string | null;
  title: string;
  description?: string | null;
  status: 'available' | 'in_progress' | 'done';
  origin: string;
  source_url?: string | null;
  verification_status: 'unverified' | 'community' | 'source_attached' | 'verified' | 'stale' | 'conflicting';
  reliability_score: number;
  last_verified_at?: string | null;
  next_verify_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface CommunityPostCreateInput {
  post_type: CommunityPost['post_type'];
  title: string;
  body: string;
  city?: string | null;
  identity_scope?: CommunityPost['identity_scope'];
  task_slug?: string | null;
  source_url?: string | null;
  media_items?: Array<Pick<CommunityPostMedia, 'media_url' | 'mime_type'>>;
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
  surface: 'plaza_feed' | 'plaza_detail' | 'tasks_from_plaza';
  post_id?: string | null;
  comment_id?: string | null;
  task_id?: string | null;
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

export function useCommunityFeed() {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['community', 'feed', user?.id, user?.city, user?.identity],
    queryFn: async () => {
      const res = await api.get('/community/feed', {
        params: {
          city: user?.city,
          identity: user?.identity,
        },
      });
      return res.data.data.items as CommunityPost[];
    },
    enabled: Boolean(user),
  });
}

export function useCreateCommunityPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CommunityPostCreateInput) => {
      const res = await api.post('/community/posts', input);
      return res.data.data as CommunityPost;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'feed'] });
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
      });
      return res.data.data as CommunityPostMedia;
    },
  });
}

export function useCommunityComments(postId: string, enabled = true) {
  return useQuery({
    queryKey: ['community', 'comments', postId],
    queryFn: async () => {
      const res = await api.get(`/community/posts/${postId}/comments`);
      return res.data.data.items as CommunityComment[];
    },
    enabled,
  });
}

export function useCreateCommunityComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const res = await api.post(`/community/posts/${postId}/comments`, { body });
      return res.data.data as CommunityComment;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['community', 'comments', postId] });
      await qc.invalidateQueries({ queryKey: ['community', 'feed'] });
    },
  });
}

export function useMarkCommunityHelpful() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await api.post(`/community/posts/${postId}/helpful`);
      return res.data.data as { post_id: string; helpful_count: number; viewer_marked_helpful: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'feed'] });
    },
  });
}

export function useAddActionToTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (actionId: string) => {
      const res = await api.post(`/community/actions/${actionId}/add-to-tasks`);
      return res.data.data as { task: PersonalTask; created: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'feed'] });
      qc.invalidateQueries({ queryKey: ['community', 'personal-tasks'] });
    },
  });
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
      qc.invalidateQueries({ queryKey: ['community', 'personal-tasks'] });
    },
  });
}

export function usePersonalTasks() {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['community', 'personal-tasks', user?.id],
    queryFn: async () => {
      const res = await api.get('/community/personal-tasks');
      return res.data.data as PersonalTask[];
    },
    enabled: Boolean(user),
  });
}

export function useRefreshPersonalTaskVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await api.post(`/community/personal-tasks/${taskId}/refresh-verification`);
      return res.data.data as PersonalTask;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'personal-tasks'] });
      qc.invalidateQueries({ queryKey: ['community', 'feed'] });
    },
  });
}

export function useStartPersonalTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await api.post(`/community/personal-tasks/${taskId}/start`);
      return res.data.data as PersonalTask;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'personal-tasks'] });
    },
  });
}

export function useCompletePersonalTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await api.post(`/community/personal-tasks/${taskId}/complete`);
      return res.data.data as PersonalTask;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'personal-tasks'] });
    },
  });
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
