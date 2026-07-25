import { create } from 'zustand';

// D-046 first-value guide. The step lives in memory only: the server-side
// `product_guide_version` decides whether the guide runs at all, and a hint
// deliberately re-appears after an app restart until the user acts on it or
// dismisses it — a hint that vanishes unseen has not done its job.
export type ProductGuideStep = 'odyssey' | 'plaza';

interface ProductGuideState {
  step: ProductGuideStep | null;
  // Guards the controller effect so one session never double-fires "started".
  hasStartedThisSession: boolean;
  setStep: (step: ProductGuideStep | null) => void;
  markStarted: () => void;
}

export const useProductGuideStore = create<ProductGuideState>((set) => ({
  step: null,
  hasStartedThisSession: false,
  setStep: (step) => set({ step }),
  markStarted: () => set({ hasStartedThisSession: true }),
}));
