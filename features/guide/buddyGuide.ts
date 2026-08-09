import { type ChapterStepMeta, createChapteredGuide } from './chapteredGuide';

// Buddy walkthrough: three chapters that each explain one surface.
// 'feed' runs on the Buddy tab (what this tab is, how to filter, where to post);
// 'wish' and 'companion' run inside the composer and explain every input.
// Chapters are independent — entering the wish composer for the first time
// starts its chapter even if the feed chapter was seen weeks ago.
export type BuddyGuideChapter = 'feed' | 'wish' | 'companion';

export type BuddyGuideStep =
  | 'feed_intro'
  | 'feed_categories'
  | 'feed_saved'
  | 'feed_create'
  | 'wish_photos'
  | 'wish_description'
  | 'wish_dates'
  | 'wish_where_to_buy'
  | 'wish_deliver_to'
  | 'wish_shipping'
  | 'wish_price'
  | 'wish_publish'
  | 'companion_category'
  | 'companion_title'
  | 'companion_body'
  | 'companion_when'
  | 'companion_city'
  | 'companion_price'
  | 'companion_publish';

export type BuddyGuideStepMeta = ChapterStepMeta<BuddyGuideChapter, BuddyGuideStep>;

export const BUDDY_GUIDE_STEPS: BuddyGuideStepMeta[] = [
  // The opening step has no target on purpose: a plain scrim + centred card
  // introduces the tab before pointing at anything.
  { id: 'feed_intro', chapter: 'feed', ringRadius: 24 },
  { id: 'feed_categories', chapter: 'feed', ringRadius: 24 },
  { id: 'feed_saved', chapter: 'feed', ringRadius: 'pill' },
  { id: 'feed_create', chapter: 'feed', ringRadius: 'pill' },

  { id: 'wish_photos', chapter: 'wish', ringRadius: 28 },
  { id: 'wish_description', chapter: 'wish', ringRadius: 16 },
  { id: 'wish_dates', chapter: 'wish', ringRadius: 16 },
  { id: 'wish_where_to_buy', chapter: 'wish', ringRadius: 16 },
  { id: 'wish_deliver_to', chapter: 'wish', ringRadius: 16 },
  { id: 'wish_shipping', chapter: 'wish', ringRadius: 16 },
  { id: 'wish_price', chapter: 'wish', ringRadius: 20 },
  { id: 'wish_publish', chapter: 'wish', ringRadius: 'pill' },

  { id: 'companion_category', chapter: 'companion', ringRadius: 16 },
  { id: 'companion_title', chapter: 'companion', ringRadius: 16 },
  { id: 'companion_body', chapter: 'companion', ringRadius: 16 },
  { id: 'companion_when', chapter: 'companion', ringRadius: 16 },
  { id: 'companion_city', chapter: 'companion', ringRadius: 16 },
  { id: 'companion_price', chapter: 'companion', ringRadius: 20 },
  { id: 'companion_publish', chapter: 'companion', ringRadius: 'pill' },
];

export const buddyGuide = createChapteredGuide<BuddyGuideChapter, BuddyGuideStep>({
  steps: BUDDY_GUIDE_STEPS,
  chapters: ['feed', 'wish', 'companion'],
  storageKey: 'postervia.buddy_guide.v1',
});

export const buddyStepMeta = buddyGuide.stepMeta;
export const buddyChapterSteps = buddyGuide.chapterSteps;
export const buddyStepPosition = buddyGuide.stepPosition;
export const nextBuddyStep = buddyGuide.nextStep;
export const prevBuddyStep = buddyGuide.prevStep;
export const buddyChapterFirstStep = buddyGuide.chapterFirstStep;
export const isBuddyChapterLastStep = buddyGuide.isChapterLastStep;
export const useBuddyGuideTarget = buddyGuide.useTarget;
export const measureBuddyTarget = buddyGuide.measureTarget;
