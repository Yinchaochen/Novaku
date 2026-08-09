import type { ChapteredGuideStoreState } from '../features/guide/chapteredGuide';
import { type SocialGuideChapter, type SocialGuideStep, socialGuide } from '../features/guide/socialGuide';

// Which Social chapters this device has already been walked through. Local-only
// like the Buddy tour (D-054): there is no funnel to report, so one AsyncStorage
// record is enough and no server field is added.
export type SocialSeenChapters = Record<SocialGuideChapter, boolean>;

export type SocialGuideState = ChapteredGuideStoreState<SocialGuideChapter, SocialGuideStep>;

export const useSocialGuideStore = socialGuide.useStore;
