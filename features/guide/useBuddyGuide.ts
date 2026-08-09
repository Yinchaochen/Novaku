import { type BuddyGuideChapter, buddyGuide } from './buddyGuide';

// Arms one chapter of the Buddy walkthrough for a surface: the Buddy tab calls
// it with 'feed', each composer with its own post type. Auto-start only fires
// once per chapter (persisted); the header "?" button re-runs it any time.
export function useBuddyGuide(chapter: BuddyGuideChapter, enabled = true) {
  return buddyGuide.useGuide(chapter, enabled);
}
