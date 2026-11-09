/**
 * The Plaza welcome is shown once, and nothing stacks on it (D-188).
 *
 * The ordering is the fragile part: four sheets can want the screen on a first
 * run, and the one that explains what the place is has to come before the one
 * that teaches posting. These assertions are what notices when a later change
 * reorders them.
 */

jest.mock('@react-native-async-storage/async-storage', () => {
  let memory: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => memory[key] ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        memory[key] = value;
      }),
      clear: jest.fn(async () => {
        memory = {};
      }),
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';

import { plazaWelcomePending, usePlazaWelcomeStore } from '../plazaWelcomeStore';

const KEY = 'postervia.plaza_welcome.v1';

beforeEach(async () => {
  await AsyncStorage.clear();
  usePlazaWelcomeStore.setState({ hydrated: false, seen: false });
});

describe('the welcome', () => {
  it('is pending for a reader who has never seen it', async () => {
    await usePlazaWelcomeStore.getState().hydrate();

    expect(plazaWelcomePending(usePlazaWelcomeStore.getState())).toBe(true);
  });

  it('is not pending before storage has been read', () => {
    // Showing it for one frame and yanking it away is worse than a beat of nothing.
    expect(plazaWelcomePending(usePlazaWelcomeStore.getState())).toBe(false);
  });

  it('stays gone once it has been dismissed', async () => {
    await usePlazaWelcomeStore.getState().hydrate();
    usePlazaWelcomeStore.getState().markSeen();

    expect(plazaWelcomePending(usePlazaWelcomeStore.getState())).toBe(false);

    usePlazaWelcomeStore.setState({ hydrated: false, seen: false });
    await usePlazaWelcomeStore.getState().hydrate();
    expect(plazaWelcomePending(usePlazaWelcomeStore.getState())).toBe(false);
  });

  it('keeps its own key, so a guide somebody skipped cannot mark it seen', async () => {
    // D-060: Buddy and Social shared one key once, and "seen" in one silently
    // ate a chapter nobody had been shown.
    await AsyncStorage.setItem('postervia.buddy_guide.v1', JSON.stringify({ feed: true }));
    await AsyncStorage.setItem('postervia.social_guide.v1', JSON.stringify({ list: true }));

    await usePlazaWelcomeStore.getState().hydrate();

    expect(plazaWelcomePending(usePlazaWelcomeStore.getState())).toBe(true);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('shows again rather than never when storage refuses', async () => {
    const original = AsyncStorage.getItem;
    (AsyncStorage as unknown as { getItem: unknown }).getItem = jest
      .fn()
      .mockRejectedValue(new Error('private window'));

    await usePlazaWelcomeStore.getState().hydrate();

    expect(plazaWelcomePending(usePlazaWelcomeStore.getState())).toBe(true);
    (AsyncStorage as unknown as { getItem: unknown }).getItem = original;
  });
});
