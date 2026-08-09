import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { AppUpdateMemory } from '../lib/appVersion';

// Local-only on purpose: which changelog this device has read and which
// update prompt it snoozed are device facts, not account facts.
const STORAGE_KEY = 'postervia.app_update.v1';

const EMPTY: AppUpdateMemory = { lastSeenVersion: null, snoozedVersion: null, snoozedAt: null };

interface AppUpdateState extends AppUpdateMemory {
  // false until AsyncStorage has been read: nothing decides before then, so a
  // returning user never gets a flash of a changelog they already dismissed.
  hydrated: boolean;
  hydrate: () => Promise<void>;
  markVersionSeen: (version: string) => void;
  snooze: (version: string, at: number) => void;
  reset: () => Promise<void>;
}

async function persist(memory: AppUpdateMemory) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // A failed write only costs the user one repeated prompt.
  }
}

export const useAppUpdateStore = create<AppUpdateState>((set, get) => ({
  ...EMPTY,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    let memory = EMPTY;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) memory = { ...EMPTY, ...(JSON.parse(raw) as Partial<AppUpdateMemory>) };
    } catch {
      // Unreadable record → treat as a fresh device.
    }
    set({ ...memory, hydrated: true });
  },

  markVersionSeen: (version) => {
    const memory: AppUpdateMemory = {
      lastSeenVersion: version,
      snoozedVersion: get().snoozedVersion,
      snoozedAt: get().snoozedAt,
    };
    set(memory);
    void persist(memory);
  },

  snooze: (version, at) => {
    const memory: AppUpdateMemory = {
      lastSeenVersion: get().lastSeenVersion,
      snoozedVersion: version,
      snoozedAt: at,
    };
    set(memory);
    void persist(memory);
  },

  reset: async () => {
    set({ ...EMPTY });
    await persist(EMPTY);
  },
}));
