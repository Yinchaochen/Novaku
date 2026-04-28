import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export interface DocumentRecord {
  id: string;
  file_name: string | null;
  mime_type: string | null;
  original_url: string;
  processing_status: 'pending' | 'ocr_done' | 'interpreted' | 'failed';
  error_detail: string | null;
  ocr_raw_text: string | null;
  analysis_summary: string | null;
  analysis_actions: unknown[] | null;
  detected_locale: string | null;
  created_at: string;
}

export interface DocumentChatSource {
  title: string;
  url: string;
}

export interface DocumentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  locale: string;
  content: string;
  sources: DocumentChatSource[];
  used_web_search: boolean;
  created_at: string;
}

export interface DocumentChatTurn {
  user_message: DocumentChatMessage;
  assistant_message: DocumentChatMessage;
}

const ACTIVE_DOCUMENT_STATUSES = new Set<DocumentRecord['processing_status']>(['pending', 'ocr_done']);

function hasActiveDocuments(documents: DocumentRecord[] | undefined) {
  return documents?.some((document) => ACTIVE_DOCUMENT_STATUSES.has(document.processing_status)) ?? false;
}

export function useDocuments() {
  const user = useAuthStore((state) => state.user);

  return useQuery<DocumentRecord[]>({
    queryKey: ['documents', user?.id],
    queryFn: async () => {
      const res = await api.get('/documents');
      return res.data.data as DocumentRecord[];
    },
    enabled: Boolean(user),
    placeholderData: (previousData) => previousData,
    refetchInterval: (query) => {
      const documents = query.state.data as DocumentRecord[] | undefined;
      return hasActiveDocuments(documents) ? 3000 : false;
    },
    refetchIntervalInBackground: true,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const queryKey = ['documents', user?.id] as const;

  return useMutation({
    mutationFn: async ({ uri, mimeType, fileName }: { uri: string; mimeType: string; fileName: string }) => {
      const form = new FormData();
      form.append('file', { uri, name: fileName, type: mimeType } as any);
      const res = await api.post('/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data as DocumentRecord;
    },
    onSuccess: async (document) => {
      queryClient.setQueryData<DocumentRecord[]>(queryKey, (current) => {
        const next = current ?? [];
        return [document, ...next.filter((item) => item.id !== document.id)];
      });
      await queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useDocumentChat(documentId: string, enabled = true) {
  const user = useAuthStore((state) => state.user);

  return useQuery<DocumentChatMessage[]>({
    queryKey: ['documents', 'chat', documentId, user?.id],
    queryFn: async () => {
      const res = await api.get(`/documents/${documentId}/messages`);
      return res.data.data as DocumentChatMessage[];
    },
    enabled: enabled && Boolean(user),
    placeholderData: (previousData) => previousData,
  });
}

export function useAskDocumentQuestion(documentId: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const queryKey = ['documents', 'chat', documentId, user?.id] as const;

  return useMutation({
    mutationFn: async (question: string) => {
      const res = await api.post(`/documents/${documentId}/messages`, { question });
      return res.data.data as DocumentChatTurn;
    },
    onSuccess: (turn) => {
      queryClient.setQueryData<DocumentChatMessage[]>(queryKey, (current) => [
        ...(current ?? []),
        turn.user_message,
        turn.assistant_message,
      ]);
    },
  });
}
