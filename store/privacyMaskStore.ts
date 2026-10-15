import { create } from 'zustand';

// On only for the frame a feedback screenshot is taken. Every PrivacyMask /
// PrivateText reads it and paints people's names, photos and messages over
// before the image exists, so nothing private leaves the phone.
interface PrivacyMaskState {
  masking: boolean;
  setMasking: (masking: boolean) => void;
}

export const usePrivacyMaskStore = create<PrivacyMaskState>((set) => ({
  masking: false,
  setMasking: (masking) => set({ masking }),
}));

// Dev only: lets a browser session check what the mask looks like on real
// screens (web cannot take the screenshot itself).
if (__DEV__ && typeof window !== 'undefined') {
  (window as unknown as { __posterviaMask?: (on: boolean) => void }).__posterviaMask = (on) =>
    usePrivacyMaskStore.getState().setMasking(on);
}
