import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/**
 * Whether this reader has been told what the Plaza is for (D-188).
 *
 * Local, not a column on users, because a stranger reading the web Plaza
 * without an account (D-151) is exactly who the welcome is written for, and a
 * guest has no row to write to. Its own key, never shared with the Buddy or
 * Social guides: D-060 learned that one key makes "seen" in one place silently
 * eat a sheet somebody has never been shown.
 */
const KEY = 'postervia.plaza_welcome.v1';

type PlazaWelcomeState = {
  hydrated: boolean;
  seen: boolean;
  hydrate: () => Promise<void>;
  markSeen: () => void;
};

export const usePlazaWelcomeStore = create<PlazaWelcomeState>((set) => ({
  hydrated: false,
  seen: false,
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(KEY);
      set({ seen: stored === '1', hydrated: true });
    } catch {
      // Storage can refuse in a private window. Showing the welcome once more
      // is the harmless end of that failure; suppressing it forever is not.
      set({ hydrated: true });
    }
  },
  markSeen: () => {
    set({ seen: true });
    AsyncStorage.setItem(KEY, '1').catch(() => {});
  },
}));

/** True while the welcome still owes the reader a showing — the walkthrough
 *  and the push notice both wait on this so nothing stacks. */
export function plazaWelcomePending(state: PlazaWelcomeState): boolean {
  return state.hydrated && !state.seen;
}
