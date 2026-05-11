import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export interface ChatSender {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface ChatMessage {
  id: string;
  sender: ChatSender;
  type: 'text' | 'image' | 'voice' | 'memo' | 'sticker' | 'deleted';
  body?: string | null;
  media_url?: string | null;
  meta?: Record<string, unknown> | null;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  type: 'self' | 'direct' | 'group';
  origin_type?: 'social' | 'buddy_post';
  origin_post_id?: string | null;
  last_message?: ChatMessage | null;
  unread_count: number;
  other_user_id?: string | null;
  other_user_name?: string | null;
  other_user_avatar?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  participant_avatars: string[];
  updated_at: string;
}

export interface ChatMessagePage {
  items: ChatMessage[];
  next_cursor?: string | null;
}

export interface UserSticker {
  id: string;
  media_url: string;
  created_at: string;
}

export type ChatOriginType = 'social' | 'buddy_post';

export function useConversations(originType?: ChatOriginType) {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['chat', 'conversations', user?.id, originType ?? 'all'],
    queryFn: async () => {
      const res = await api.get('/chat/conversations', {
        params: originType ? { origin_type: originType } : undefined,
      });
      return res.data.data as ChatConversation[];
    },
    enabled: Boolean(user),
    refetchInterval: 3000,
  });
}

export function useSelfConversation() {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['chat', 'conversation', 'self', user?.id],
    queryFn: async () => {
      const res = await api.get('/chat/conversations/self');
      return res.data.data as ChatConversation;
    },
    enabled: Boolean(user),
  });
}

export function useDirectConversation(userId: string | null) {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['chat', 'conversation', 'direct', userId, user?.id],
    queryFn: async () => {
      const res = await api.get(`/chat/conversations/direct/${userId}`);
      return res.data.data as ChatConversation;
    },
    enabled: Boolean(user) && userId != null,
  });
}

export function useGroupConversation(groupId: string | null) {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['chat', 'conversation', 'group', groupId, user?.id],
    queryFn: async () => {
      const res = await api.get(`/chat/conversations/group/${groupId}`);
      return res.data.data as ChatConversation;
    },
    enabled: Boolean(user) && groupId != null,
  });
}

export interface UseChatMessagesOptions {
  /** When set, the server returns the page that contains this message (target + older context). */
  atMessageId?: string | null;
}

export function useChatMessages(
  conversationId: string | null,
  options: UseChatMessagesOptions = {},
) {
  const user = useAuthStore((state) => state.user);
  const atMessageId = options.atMessageId ?? null;
  return useQuery({
    queryKey: ['chat', 'messages', conversationId, atMessageId, user?.id],
    queryFn: async () => {
      const res = await api.get(`/chat/conversations/${conversationId}/messages`, {
        params: {
          limit: 30,
          at_message_id: atMessageId ?? undefined,
        },
      });
      return res.data.data as ChatMessagePage;
    },
    enabled: Boolean(user) && conversationId != null,
    // While anchored to a target, don't auto-refresh (would re-fetch and clobber the anchor view).
    refetchInterval: atMessageId ? false : 3000,
  });
}

export interface ChatSearchHit {
  message: ChatMessage;
  conversation_id: string;
  conversation_type: 'self' | 'direct' | 'group';
  conversation_title: string | null;
  conversation_avatar_url: string | null;
}

export interface ChatSearchResult {
  items: ChatSearchHit[];
}

export function useChatSearch(query: string, enabled = true) {
  const user = useAuthStore((state) => state.user);
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['chat', 'search', user?.id, trimmed],
    queryFn: async () => {
      const res = await api.get('/chat/search', { params: { q: trimmed, limit: 20 } });
      return res.data.data as ChatSearchResult;
    },
    enabled: enabled && Boolean(user) && trimmed.length > 0,
    staleTime: 30_000,
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      type: 'text' | 'image' | 'voice' | 'memo' | 'sticker';
      body?: string;
      media_url?: string;
      meta?: Record<string, unknown>;
    }) => {
      const res = await api.post(`/chat/conversations/${conversationId}/messages`, input);
      return res.data.data as ChatMessage;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      await qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      await api.post(`/chat/conversations/${conversationId}/read`);
      return { conversationId };
    },
    onMutate: async (conversationId) => {
      // Flip the unread badge to 0 in the conversations list cache the moment
      // the user opens the chat, instead of waiting up to 3s for the next
      // refetchInterval to discover the cleared count.
      await qc.cancelQueries({ queryKey: ['chat', 'conversations'] });
      const snapshot = qc.getQueriesData<ChatConversation[]>({
        queryKey: ['chat', 'conversations'],
      });
      qc.setQueriesData<ChatConversation[]>(
        { queryKey: ['chat', 'conversations'] },
        (old) =>
          old
            ? old.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
            : old,
      );
      return { snapshot };
    },
    onError: (_err, _conversationId, context) => {
      context?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
}

export function useDeleteMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, scope }: { messageId: string; scope: 'self' | 'all' }) => {
      await api.delete(`/chat/conversations/${conversationId}/messages/${messageId}`, {
        params: { scope },
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      await qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
}

export function useUploadChatMedia(conversationId: string) {
  return useMutation({
    mutationFn: async (file: {
      uri: string;
      name: string;
      type: string;
    }) => {
      const form = new FormData();
      // React Native FormData accepts { uri, name, type } objects
      form.append('file', file as unknown as Blob);
      const res = await api.post(`/chat/conversations/${conversationId}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data as { url: string };
    },
  });
}

export function useUploadStickerMedia() {
  return useMutation({
    mutationFn: async (file: { uri: string; name: string; type: string }) => {
      const form = new FormData();
      form.append('file', file as unknown as Blob);
      const res = await api.post('/chat/stickers/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data as { url: string };
    },
  });
}

export function useStickers() {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['chat', 'stickers', user?.id],
    queryFn: async () => {
      const res = await api.get('/chat/stickers');
      return res.data.data as UserSticker[];
    },
    enabled: Boolean(user),
  });
}

export function useSaveSticker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { media_url: string }) => {
      const res = await api.post('/chat/stickers', input);
      return res.data.data as UserSticker;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['chat', 'stickers'] });
    },
  });
}

export function useEditMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, body }: { messageId: string; body: string }) => {
      const res = await api.patch(`/chat/conversations/${conversationId}/messages/${messageId}`, { body });
      return res.data.data as ChatMessage;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
    },
  });
}

export function useDeleteSticker(stickerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/chat/stickers/${stickerId}`);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['chat', 'stickers'] });
    },
  });
}

export function useConversationFavorites(conversationId: string | null) {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['chat', 'favorites', conversationId, user?.id],
    queryFn: async () => {
      const res = await api.get(`/chat/conversations/${conversationId}/favorites`);
      return res.data.data as string[];
    },
    enabled: Boolean(user) && conversationId != null,
  });
}

export function useFavoriteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      await api.post(`/chat/messages/${messageId}/favorite`);
      return { messageId, conversationId };
    },
    onMutate: async ({ messageId, conversationId }) => {
      await qc.cancelQueries({ queryKey: ['chat', 'favorites', conversationId] });
      const snapshot = qc.getQueriesData<string[]>({
        queryKey: ['chat', 'favorites', conversationId],
      });
      qc.setQueriesData<string[]>(
        { queryKey: ['chat', 'favorites', conversationId] },
        (old) => (old ? (old.includes(messageId) ? old : [...old, messageId]) : [messageId]),
      );
      return { snapshot };
    },
    onError: (_err, _input, context) => {
      context?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: (_data, _err, { conversationId }) => {
      qc.invalidateQueries({ queryKey: ['chat', 'favorites', conversationId] });
    },
  });
}

export function useUnfavoriteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      await api.delete(`/chat/messages/${messageId}/favorite`);
      return { messageId, conversationId };
    },
    onMutate: async ({ messageId, conversationId }) => {
      await qc.cancelQueries({ queryKey: ['chat', 'favorites', conversationId] });
      const snapshot = qc.getQueriesData<string[]>({
        queryKey: ['chat', 'favorites', conversationId],
      });
      qc.setQueriesData<string[]>(
        { queryKey: ['chat', 'favorites', conversationId] },
        (old) => (old ? old.filter((id) => id !== messageId) : old),
      );
      return { snapshot };
    },
    onError: (_err, _input, context) => {
      context?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: (_data, _err, { conversationId }) => {
      qc.invalidateQueries({ queryKey: ['chat', 'favorites', conversationId] });
    },
  });
}
