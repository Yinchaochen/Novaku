import { create } from 'zustand';

// One-shot handoff from Plaza search's zero-result CTA into the Plaza composer:
// the search screen sets an intent and navigates back; the Plaza tab consumes
// it exactly once, opens the composer, and prefills the question title.
export interface PlazaComposeIntent {
  title: string;
  postType: 'question';
}

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
