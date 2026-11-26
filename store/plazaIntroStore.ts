import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/**
 * Whether this reader closed the intro video at the top of the Plaza. Local for
 * the same reason as the welcome (D-188): guests read the Plaza too. Its own key;
 * the ? menu brings the video back.
 */
const KEY = 'postervia.plaza_intro.v1';

type PlazaIntroState = {
  hydrated: boolean;
  hidden: boolean;
  hydrate: () => Promise<void>;
  hide: () => void;
  show: () => void;
};

export const usePlazaIntroStore = create<PlazaIntroState>((set) => ({
  hydrated: false,
  hidden: false,
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(KEY);
      set({ hidden: stored === 'hidden', hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  hide: () => {
    set({ hidden: true });
    AsyncStorage.setItem(KEY, 'hidden').catch(() => {});
  },
  show: () => {
    set({ hidden: false });
    AsyncStorage.removeItem(KEY).catch(() => {});
  },
}));
