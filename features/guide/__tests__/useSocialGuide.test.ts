jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  SOCIAL_GUIDE_STEPS,
  socialChapterSteps,
  socialStepPosition,
  nextSocialStep,
  prevSocialStep,
} from '../socialGuide';
import { useSocialGuide } from '../useSocialGuide';
import { useSocialGuideStore } from '../../../store/socialGuideStore';
import { useBuddyGuideStore } from '../../../store/buddyGuideStore';

const STORAGE_KEY = 'postervia.social_guide.v1';
const CHAPTERS = ['list', 'connections', 'group', 'chat', 'group_chat', 'event'] as const;

describe('social guide step model', () => {
  it('keeps every step inside exactly one chapter', () => {
    const counted = CHAPTERS.reduce((sum, chapter) => sum + socialChapterSteps(chapter).length, 0);
    expect(counted).toBe(SOCIAL_GUIDE_STEPS.length);
  });

  it('numbers steps within their own chapter', () => {
    expect(socialStepPosition('list_intro')).toEqual({ index: 0, total: 6 });
    expect(socialStepPosition('event_title').index).toBe(0);
  });

  it('does not walk across a chapter boundary', () => {
    expect(nextSocialStep('list_notifications')).toBeNull();
    expect(prevSocialStep('chat_input')).toBeNull();
    expect(nextSocialStep('group_name')).toBe('group_members');
  });

  it('teaches the composer again in a first group chat', () => {
    // Someone whose first conversation is a group has never been shown how to
    // send anything, so the group chapter repeats those steps on purpose.
    const groupChat = socialChapterSteps('group_chat').map((meta) => meta.id);
    expect(groupChat.slice(0, 4)).toEqual([
      'group_chat_input',
      'group_chat_emoji',
      'group_chat_image',
      'group_chat_plus',
    ]);
    expect(groupChat).toContain('group_chat_create_event');
  });
});

describe('useSocialGuide', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    useSocialGuideStore.setState({ step: null, confirmingPublish: false, seen: null });
    useBuddyGuideStore.setState({ step: null, confirmingPublish: false, seen: null });
    await AsyncStorage.clear();
  });

  it('auto-starts a chapter the user has not seen and marks it seen when finished', async () => {
    const { result } = await renderHook(() => useSocialGuide('chat'));
    await waitFor(() => expect(useSocialGuideStore.getState().step).toBe('chat_input'));

    await act(async () => result.current.end());

    expect(useSocialGuideStore.getState().step).toBeNull();
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toContain('"chat":true'),
    );
  });

  it('does not auto-start when the surface is not on screen', async () => {
    const { result } = await renderHook(() => useSocialGuide('group', false));
    await waitFor(() => expect(useSocialGuideStore.getState().seen).not.toBeNull());

    expect(useSocialGuideStore.getState().step).toBeNull();
    expect(result.current.step).toBeNull();
  });

  it('re-runs on demand after it was seen', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ list: true }));

    const { result } = await renderHook(() => useSocialGuide('list'));
    await waitFor(() => expect(useSocialGuideStore.getState().seen).not.toBeNull());
    expect(useSocialGuideStore.getState().step).toBeNull();

    await act(async () => result.current.restart());
    expect(useSocialGuideStore.getState().step).toBe('list_intro');
  });

  it('hands the tour over to the surface the user actually opened', async () => {
    await renderHook(() => useSocialGuide('list'));
    await waitFor(() => expect(useSocialGuideStore.getState().step).toBe('list_intro'));
    await act(async () => useSocialGuideStore.getState().setStep('list_notifications'));

    await renderHook(() => useSocialGuide('group'));
    await waitFor(() => expect(useSocialGuideStore.getState().step).toBe('group_name'));
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toContain('"list":true'),
    );
  });

  it('keeps its progress separate from the Buddy walkthrough', async () => {
    // One shared storage key would let finishing a Buddy chapter silence a
    // Social chapter the user has never seen.
    const { result } = await renderHook(() => useSocialGuide('list'));
    await waitFor(() => expect(useSocialGuideStore.getState().step).toBe('list_intro'));
    await act(async () => result.current.end());

    const stored = await AsyncStorage.getItem('postervia.buddy_guide.v1');
    expect(stored).toBeNull();
    expect(useBuddyGuideStore.getState().seen).toBeNull();
  });
});
