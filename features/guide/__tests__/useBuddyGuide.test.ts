jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  BUDDY_GUIDE_STEPS,
  buddyChapterSteps,
  buddyStepPosition,
  nextBuddyStep,
  prevBuddyStep,
} from '../buddyGuide';
import { useBuddyGuide } from '../useBuddyGuide';
import { useBuddyGuideStore } from '../../../store/buddyGuideStore';

const STORAGE_KEY = 'postervia.buddy_guide.v1';

describe('buddy guide step model', () => {
  it('keeps every step inside exactly one chapter', () => {
    const chapters = ['feed', 'wish', 'companion'] as const;
    const counted = chapters.reduce((sum, chapter) => sum + buddyChapterSteps(chapter).length, 0);
    expect(counted).toBe(BUDDY_GUIDE_STEPS.length);
  });

  it('numbers steps within their own chapter', () => {
    expect(buddyStepPosition('wish_photos')).toEqual({ index: 0, total: 8 });
    expect(buddyStepPosition('feed_intro').index).toBe(0);
  });

  it('does not walk across a chapter boundary', () => {
    expect(nextBuddyStep('feed_create')).toBeNull();
    expect(prevBuddyStep('wish_photos')).toBeNull();
    expect(nextBuddyStep('wish_photos')).toBe('wish_description');
  });
});

describe('useBuddyGuide', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    useBuddyGuideStore.setState({ step: null, confirmingPublish: false, seen: null });
    await AsyncStorage.clear();
  });

  it('auto-starts a chapter the user has not seen and marks it seen when finished', async () => {
    const { result } = await renderHook(() => useBuddyGuide('wish'));
    await waitFor(() => expect(useBuddyGuideStore.getState().step).toBe('wish_photos'));

    await act(async () => result.current.end());

    expect(useBuddyGuideStore.getState().step).toBeNull();
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toContain('"wish":true'),
    );
  });

  it('does not auto-start a chapter that was already seen', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ feed: false, wish: true, companion: false }),
    );

    const { result } = await renderHook(() => useBuddyGuide('wish'));
    await waitFor(() => expect(useBuddyGuideStore.getState().seen).not.toBeNull());
    expect(useBuddyGuideStore.getState().step).toBeNull();

    // The header entry still re-runs it on demand.
    await act(async () => result.current.restart());
    expect(useBuddyGuideStore.getState().step).toBe('wish_photos');
  });

  it('advancing past the last step ends the chapter instead of leaking into the next one', async () => {
    const { result } = await renderHook(() => useBuddyGuide('feed'));
    await waitFor(() => expect(useBuddyGuideStore.getState().step).toBe('feed_intro'));

    await act(async () => result.current.advance());
    await act(async () => result.current.advance());
    await act(async () => result.current.advance());
    expect(useBuddyGuideStore.getState().step).toBe('feed_create');

    await act(async () => result.current.advance());
    expect(useBuddyGuideStore.getState().step).toBeNull();
  });

  it('hands the tour over to the surface the user actually opened', async () => {
    // Feed chapter left open on its last step (the user tapped + and walked
    // into the composer): the composer chapter must still start.
    await renderHook(() => useBuddyGuide('feed'));
    await waitFor(() => expect(useBuddyGuideStore.getState().step).toBe('feed_intro'));
    await act(async () => useBuddyGuideStore.getState().setStep('feed_create'));

    await renderHook(() => useBuddyGuide('wish'));
    await waitFor(() => expect(useBuddyGuideStore.getState().step).toBe('wish_photos'));
    // The abandoned chapter had reached its final step, so it counts as seen.
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toContain('"feed":true'),
    );
  });

  it('does not mark an abandoned chapter seen when it was left mid-way', async () => {
    await renderHook(() => useBuddyGuide('feed'));
    await waitFor(() => expect(useBuddyGuideStore.getState().step).toBe('feed_intro'));
    await act(async () => useBuddyGuideStore.getState().setStep('feed_categories'));

    await renderHook(() => useBuddyGuide('wish'));
    await waitFor(() => expect(useBuddyGuideStore.getState().step).toBe('wish_photos'));
    expect(useBuddyGuideStore.getState().seen?.feed).toBe(false);
  });

  it('only reports the step that belongs to its own surface', async () => {
    await renderHook(() => useBuddyGuide('feed'));
    await waitFor(() => expect(useBuddyGuideStore.getState().step).toBe('feed_intro'));

    const composer = await renderHook(() => useBuddyGuide('wish', false));
    expect(composer.result.current.step).toBeNull();
    expect(useBuddyGuideStore.getState().step).toBe('feed_intro');
  });
});
