/**
 * The Plaza intro video stays closed once the reader closes it, and the ? menu
 * brings it back.
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
      removeItem: jest.fn(async (key: string) => {
        delete memory[key];
      }),
      clear: jest.fn(async () => {
        memory = {};
      }),
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';

import { usePlazaIntroStore } from '../plazaIntroStore';

const KEY = 'postervia.plaza_intro.v1';

beforeEach(async () => {
  await AsyncStorage.clear();
  usePlazaIntroStore.setState({ hydrated: false, hidden: false });
});

it('shows the video to a reader who never closed it', async () => {
  await usePlazaIntroStore.getState().hydrate();
  expect(usePlazaIntroStore.getState()).toMatchObject({ hydrated: true, hidden: false });
});

it('remembers that the reader closed it', async () => {
  usePlazaIntroStore.getState().hide();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(await AsyncStorage.getItem(KEY)).toBe('hidden');
  usePlazaIntroStore.setState({ hydrated: false, hidden: false });
  await usePlazaIntroStore.getState().hydrate();
  expect(usePlazaIntroStore.getState().hidden).toBe(true);
});

it('brings it back from the menu', async () => {
  usePlazaIntroStore.getState().hide();
  usePlazaIntroStore.getState().show();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(usePlazaIntroStore.getState().hidden).toBe(false);
  expect(await AsyncStorage.getItem(KEY)).toBeNull();
});

it('still shows the video when storage cannot be read', async () => {
  (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('private window'));
  await usePlazaIntroStore.getState().hydrate();
  expect(usePlazaIntroStore.getState()).toMatchObject({ hydrated: true, hidden: false });
});
