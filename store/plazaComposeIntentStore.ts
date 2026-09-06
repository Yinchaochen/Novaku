import { create } from 'zustand';

import type { CommunityPost } from '../features/community/useCommunity';

// One-shot handoff into the Plaza composer, which lives on the Plaza tab and
// nowhere else. Plaza search's zero-result CTA asks a question; the post
// detail screen, opened from Profile / a user page / search / a shared link,
// asks to edit. The sender sets an intent and navigates to the tab; the tab
// consumes it exactly once and opens the composer accordingly.
export type PlazaComposeIntent =
  | { kind: 'ask'; title: string; postType: 'question' }
  | { kind: 'edit'; post: CommunityPost };

interface PlazaComposeIntentState {
  intent: PlazaComposeIntent | null;
  setIntent: (intent: PlazaComposeIntent) => void;
  consume: () => PlazaComposeIntent | null;
}

export const usePlazaComposeIntentStore = create<PlazaComposeIntentState>((set, get) => ({
  intent: null,
  setIntent: (intent) => set({ intent }),
  consume: () => {
    const intent = get().intent;
    if (intent) {
      set({ intent: null });
    }
    return intent;
  },
}));
