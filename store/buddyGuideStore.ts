import { type BuddyGuideChapter, type BuddyGuideStep, buddyGuide } from '../features/guide/buddyGuide';
import type { ChapteredGuideStoreState } from '../features/guide/chapteredGuide';

// Which chapters the user has already been walked through. Local-only on
// purpose: unlike the Plaza walkthrough (D-050) this tour has no funnel to
// report, so it needs no server field — one AsyncStorage record is enough.
// The state machine itself lives in features/guide/chapteredGuide.ts.
export type BuddySeenChapters = Record<BuddyGuideChapter, boolean>;

export type BuddyGuideState = ChapteredGuideStoreState<BuddyGuideChapter, BuddyGuideStep>;

export const useBuddyGuideStore = buddyGuide.useStore;
