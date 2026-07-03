import { create } from 'zustand';

// MS-16: NetInfo only tells us "connected vs not" — it stays "connected" on
// a weak-signal/lossy link that still times every request out. This store
// tracks consecutive request failures (network errors + 5xx) so the UI can
// distinguish "genuinely offline" (NetInfo, already handled by
// onlineManager in lib/queryClient.ts) from "connected but struggling"
// (this store). Reported from the axios interceptor in lib/api.ts.
const DEGRADED_THRESHOLD = 3;

interface NetworkHealthState {
  consecutiveFailures: number;
  isDegraded: boolean;
  reportSuccess: () => void;
  reportFailure: () => void;
}

export const useNetworkHealthStore = create<NetworkHealthState>((set, get) => ({
  consecutiveFailures: 0,
  isDegraded: false,
  reportSuccess: () => {
    if (get().consecutiveFailures === 0 && !get().isDegraded) return;
    set({ consecutiveFailures: 0, isDegraded: false });
  },
  reportFailure: () => {
    const consecutiveFailures = get().consecutiveFailures + 1;
    set({
      consecutiveFailures,
      isDegraded: consecutiveFailures >= DEGRADED_THRESHOLD,
    });
  },
}));
