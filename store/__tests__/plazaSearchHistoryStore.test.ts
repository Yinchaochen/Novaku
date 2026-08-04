jest.mock('@react-native-async-storage/async-storage', () => {
  const memory: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => memory[key] ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        memory[key] = value;
      }),
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  PLAZA_SEARCH_HISTORY_LIMIT,
  normalizeHistoryQuery,
  pushHistoryEntry,
  usePlazaSearchHistoryStore,
} from '../plazaSearchHistoryStore';

describe('normalizeHistoryQuery', () => {
  it('strips LIKE wildcards, collapses whitespace, caps length', () => {
    expect(normalizeHistoryQuery('  Anmeldung   Termin ')).toBe('Anmeldung Termin');
    expect(normalizeHistoryQuery('a%b_c')).toBe('a b c');
    expect(normalizeHistoryQuery('x'.repeat(500)).length).toBeLessThanOrEqual(120);
  });
});

describe('pushHistoryEntry', () => {
  it('prepends, dedupes case-insensitively, and caps at the limit', () => {
    let items: string[] = [];
    for (let i = 0; i < 15; i += 1) {
      items = pushHistoryEntry(items, `query ${i}`);
    }
    expect(items).toHaveLength(PLAZA_SEARCH_HISTORY_LIMIT);
    expect(items[0]).toBe('query 14');

    const deduped = pushHistoryEntry(['Anmeldung', 'SIM Karte'], 'anmeldung');
    expect(deduped).toEqual(['anmeldung', 'SIM Karte']);
  });

  it('ignores queries shorter than 2 characters', () => {
    expect(pushHistoryEntry(['keep'], ' a ')).toEqual(['keep']);
  });
});

describe('usePlazaSearchHistoryStore', () => {
  beforeEach(() => {
    usePlazaSearchHistoryStore.setState({ items: [], hydrated: false });
  });

  it('add / remove / clear update items', () => {
    const store = usePlazaSearchHistoryStore.getState();
    store.add('Anmeldung Termin');
    store.add('儿科医生');
    expect(usePlazaSearchHistoryStore.getState().items).toEqual(['儿科医生', 'Anmeldung Termin']);

    usePlazaSearchHistoryStore.getState().remove('儿科医生');
    expect(usePlazaSearchHistoryStore.getState().items).toEqual(['Anmeldung Termin']);

    usePlazaSearchHistoryStore.getState().clear();
    expect(usePlazaSearchHistoryStore.getState().items).toEqual([]);
  });

  it('hydrate loads persisted items once', async () => {
    await AsyncStorage.setItem(
      'postervia.plaza_search_history.v1',
      JSON.stringify(['stored one', 'stored two']),
    );
    await usePlazaSearchHistoryStore.getState().hydrate();
    expect(usePlazaSearchHistoryStore.getState().items).toEqual(['stored one', 'stored two']);
    expect(usePlazaSearchHistoryStore.getState().hydrated).toBe(true);
  });
});
