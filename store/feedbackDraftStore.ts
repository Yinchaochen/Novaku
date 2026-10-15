import { create } from 'zustand';

// Carries the masked screenshot from the screen where feedback was started to
// the feedback form. Kept in memory only: it is never persisted.
interface FeedbackDraftState {
  screenshotBase64: string | null;
  screen: string | null;
  start: (draft: { screenshotBase64: string | null; screen: string | null }) => void;
  removeScreenshot: () => void;
  clear: () => void;
}

export const useFeedbackDraftStore = create<FeedbackDraftState>((set) => ({
  screenshotBase64: null,
  screen: null,
  start: ({ screenshotBase64, screen }) => set({ screenshotBase64, screen }),
  removeScreenshot: () => set({ screenshotBase64: null }),
  clear: () => set({ screenshotBase64: null, screen: null }),
}));
