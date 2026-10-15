import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { api } from '../../lib/api';
import { installedAppVersion } from '../../lib/appVersion';
import { captureMaskedScreen } from '../../lib/feedbackCapture';
import { useFeedbackDraftStore } from '../../store/feedbackDraftStore';

export const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/GsKN7GrJyYw6zlGwmCmATJ';

export interface FeedbackInput {
  body: string;
  contactEmail?: string | null;
}

export interface AdminFeedbackItem {
  id: string;
  user_id: string | null;
  contact_email: string | null;
  body: string;
  screen: string | null;
  app_version: string | null;
  platform: string | null;
  os_version: string | null;
  locale: string | null;
  has_screenshot: boolean;
  status: 'new' | 'done';
  created_at: string | null;
}

/**
 * Open the feedback form. With `withScreenshot`, the current screen is captured
 * first, people masked, so the form can show it before anything is sent.
 * `delayMs` lets a closing sheet finish animating out of the picture.
 */
export async function openFeedback({
  screen,
  withScreenshot,
  delayMs = 0,
}: {
  screen: string | null;
  withScreenshot: boolean;
  delayMs?: number;
}) {
  if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  const screenshotBase64 = withScreenshot ? await captureMaskedScreen() : null;
  useFeedbackDraftStore.getState().start({ screenshotBase64, screen });
  router.push('/feedback' as never);
}

export function useSendFeedback() {
  return useMutation({
    mutationFn: async (input: FeedbackInput) => {
      const { screenshotBase64, screen } = useFeedbackDraftStore.getState();
      const res = await api.post(
        '/feedback',
        {
          body: input.body,
          contact_email: input.contactEmail || null,
          screen,
          app_version: installedAppVersion(),
          platform: Platform.OS,
          os_version: String(Platform.Version ?? ''),
          screenshot_base64: screenshotBase64,
        },
        // A screenshot is a few hundred KB; the global 10s is for small reads.
        { timeout: 60000 },
      );
      return res.data.data as { id: string };
    },
    onSuccess: () => useFeedbackDraftStore.getState().clear(),
  });
}

export function useAdminFeedback() {
  return useQuery({
    queryKey: ['admin', 'feedback'],
    queryFn: async () => {
      const res = await api.get('/admin/feedback');
      return res.data.data.items as AdminFeedbackItem[];
    },
  });
}

export function useAdminFeedbackScreenshot(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'feedback', 'screenshot', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get(`/admin/feedback/${id}/screenshot`);
      return res.data.data.data_uri as string;
    },
  });
}

export function useSetFeedbackStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'new' | 'done' }) => {
      await api.patch(`/admin/feedback/${id}`, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] }),
  });
}
