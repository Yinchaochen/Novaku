import { create } from 'zustand';

export interface SearchOpenIntent {
  conversationId: string;
  scrollToMessageId?: string | null;
  /** Which Social tab list the conversation lives in. Set when navigating from
   *  a context that already knows the origin (e.g. tapping "Contact" on a
   *  buddy_post). The Social tab uses this to flip its origin filter before
   *  searching the conversation list. Omitted → assume 'social'. */
  origin?: 'social' | 'buddy_post';
}

interface SearchIntentState {
  /**
   * Cross-route signal that the Social tab should open a specific conversation
   * (and optionally scroll to a specific message). Set from /social/search,
   * consumed and cleared by the Social tab.
   */
  openIntent: SearchOpenIntent | null;
  setOpenIntent: (intent: SearchOpenIntent) => void;
  clearOpenIntent: () => void;
}

export const useSearchIntentStore = create<SearchIntentState>((set) => ({
  openIntent: null,
  setOpenIntent: (intent) => set({ openIntent: intent }),
  clearOpenIntent: () => set({ openIntent: null }),
}));
