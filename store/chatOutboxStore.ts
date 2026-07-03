import { create } from 'zustand';

import type { ChatMessage } from '../features/chat/useChat';

// MS-16 / P1: the local send outbox. Optimistic messages live here — NOT in
// the messages query cache — so the chat's 3s refetch poll can't wipe a
// still-in-flight message off the screen under a slow/flaky network. On
// success the message is moved into the query cache and dropped from here;
// on failure it stays with _failed=true for tap-to-retry. Keyed by
// conversationId → clientId.
interface ChatOutboxState {
  byConversation: Record<string, Record<string, ChatMessage>>;
  add: (conversationId: string, message: ChatMessage) => void;
  markFailed: (conversationId: string, clientId: string) => void;
  remove: (conversationId: string, clientId: string) => void;
}

export const useChatOutboxStore = create<ChatOutboxState>((set) => ({
  byConversation: {},
  add: (conversationId, message) =>
    set((state) => ({
      byConversation: {
        ...state.byConversation,
        [conversationId]: {
          ...state.byConversation[conversationId],
          [message.id]: message,
        },
      },
    })),
  markFailed: (conversationId, clientId) =>
    set((state) => {
      const conv = state.byConversation[conversationId];
      const existing = conv?.[clientId];
      if (!existing) return state;
      return {
        byConversation: {
          ...state.byConversation,
          [conversationId]: {
            ...conv,
            [clientId]: { ...existing, _pending: false, _failed: true },
          },
        },
      };
    }),
  remove: (conversationId, clientId) =>
    set((state) => {
      const conv = state.byConversation[conversationId];
      if (!conv || !(clientId in conv)) return state;
      const next = { ...conv };
      delete next[clientId];
      return {
        byConversation: { ...state.byConversation, [conversationId]: next },
      };
    }),
}));
