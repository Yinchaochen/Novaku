import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

// Plaza search history (PLAZA-SEARCH-001). Local-only, non-sensitive: the last
// few query strings, capped and clearable. Server-side search analytics live in
// the recommendation-event pipeline, not here.
export const PLAZA_SEARCH_HISTORY_KEY = 'postervia.plaza_search_history.v1';
export const PLAZA_SEARCH_HISTORY_LIMIT = 10;

export function normalizeHistoryQuery(raw: string): string {
  return raw
    .replace(/[%_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

export function pushHistoryEntry(items: string[], raw: string): string[] {
  const query = normalizeHistoryQuery(raw);
  if (query.length < 2) {
    return items;
  }
  const rest = items.filter((item) => item.toLowerCase() !== query.toLowerCase());
  return [query, ...rest].slice(0, PLAZA_SEARCH_HISTORY_LIMIT);
}

interface PlazaSearchHistoryState {
  items: string[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (query: string) => void;
  remove: (query: string) => void;
  clear: () => void;
}

function persist(items: string[]): void {
  AsyncStorage.setItem(PLAZA_SEARCH_HISTORY_KEY, JSON.stringify(items)).catch(() => undefined);
}

export const usePlazaSearchHistoryStore = create<PlazaSearchHistoryState>((set, get) => ({
  items: [],
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) {
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(PLAZA_SEARCH_HISTORY_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const items = Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string').slice(0, PLAZA_SEARCH_HISTORY_LIMIT)
        : [];
      set({ items, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  add: (query) => {
    const items = pushHistoryEntry(get().items, query);
    set({ items });
    persist(items);
  },
  remove: (query) => {
    const items = get().items.filter((item) => item !== query);
    set({ items });
    persist(items);
  },
  clear: () => {
    set({ items: [] });
    persist([]);
  },
}));
