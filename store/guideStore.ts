import { create } from 'zustand';

// D-050 spotlight walkthrough (supersedes the D-046 hint cards): one guided
// first-post flow on Plaza. Step state lives in memory only — the server-side
// `product_guide_version` decides whether the walkthrough auto-arms, and an
// unfinished run deliberately re-arms on the next app start until the user
// publishes or skips: guidance that vanished unseen has not done its job.
export type ProductGuideStep =
  | 'compose_entry'
  | 'photo'
  | 'title'
  | 'body'
  | 'location'
  | 'publish';

interface ProductGuideState {
  step: ProductGuideStep | null;
  // Final step swaps the real submit for an explicit confirm sheet rendered
  // by the spotlight overlay — the guide never publishes on its own.
  confirmingPublish: boolean;
  // Guards the controller effect so one session never double-fires "started".
  hasStartedThisSession: boolean;
  setStep: (step: ProductGuideStep | null) => void;
  setConfirmingPublish: (confirmingPublish: boolean) => void;
  markStarted: () => void;
}

export const useProductGuideStore = create<ProductGuideState>((set) => ({
  step: null,
  confirmingPublish: false,
  hasStartedThisSession: false,
  setStep: (step) => set({ step, confirmingPublish: false }),
  setConfirmingPublish: (confirmingPublish) => set({ confirmingPublish }),
  markStarted: () => set({ hasStartedThisSession: true }),
}));
