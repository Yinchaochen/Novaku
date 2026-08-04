import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { CommunityPost } from '../community/useCommunity';

export interface AdminReportTarget {
  author_name: string | null;
  title: string | null;
  body: string | null;
}

export interface AdminContentReport {
  id: string;
  content_type: 'post' | 'comment' | 'profile';
  content_id: string;
  reason_category: string;
  reason_description: string;
  reported_at: string;
  priority: string;
  status: 'pending' | 'action_taken' | 'no_action' | 'invalid';
  reporter_email: string | null;
  target: AdminReportTarget | null;
}

export function useAdminContentReports(status: string | null = 'pending') {
  return useQuery<AdminContentReport[]>({
    queryKey: ['admin', 'moderation', 'reports', status],
    queryFn: async () => {
      const res = await api.get('/admin/community/reports', {
        params: status ? { status } : undefined,
      });
      return res.data.data.items as AdminContentReport[];
    },
  });
}

export function useAdminFlaggedPosts() {
  return useQuery<CommunityPost[]>({
    queryKey: ['admin', 'moderation', 'flagged-posts'],
    queryFn: async () => {
      const res = await api.get('/admin/community/posts', {
        params: { flagged_for_review: true },
      });
      return res.data.data.items as CommunityPost[];
    },
  });
}

// D-033: video posts held in 'review' by frame moderation (uncertain frames,
// API failure, or soft flags) — the human decides approve/reject.
export function useAdminVideoReviewPosts() {
  return useQuery<CommunityPost[]>({
    queryKey: ['admin', 'moderation', 'video-review'],
    queryFn: async () => {
      const res = await api.get('/admin/community/posts', {
        params: { moderation_status: 'review' },
      });
      const items = res.data.data.items as CommunityPost[];
      return items.filter((post) =>
        post.media_items.some((item) => (item.mime_type ?? '').startsWith('video/')),
      );
    },
  });
}

export function useResolveContentReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      action,
    }: {
      reportId: string;
      action: 'action_taken' | 'no_action' | 'invalid';
    }) => {
      const res = await api.post(`/admin/community/reports/${reportId}/resolve`, { action });
      return res.data.data as { id: string; status: string };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] });
      await queryClient.invalidateQueries({ queryKey: ['community'] });
    },
  });
}

export function useUpdatePostModeration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      moderationStatus,
    }: {
      postId: string;
      moderationStatus: 'approved' | 'rejected' | 'review';
    }) => {
      const res = await api.post(`/admin/community/posts/${postId}/moderation`, {
        moderation_status: moderationStatus,
      });
      return res.data.data as { id: string; moderation_status: string };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] });
      await queryClient.invalidateQueries({ queryKey: ['community'] });
    },
  });
}
