import { type ChapterStepMeta, createChapteredGuide } from './chapteredGuide';

// Social walkthrough: one chapter per surface, each armed when the user first
// reaches that surface (lisum 2026-08-08: "用户点到主屏就介绍主屏幕，用户点进
// 聊天界面再介绍聊天界面，用户点进群聊再介绍群聊").
//
//   list        — the Social tab itself
//   connections — the add-friend panel behind + → add friend or group
//   group       — the create-group form
//   chat        — a direct or self conversation
//   group_chat  — a group conversation (chat basics + group events)
//   event       — the create-meetup form inside a group
export type SocialGuideChapter =
  | 'list'
  | 'connections'
  | 'group'
  | 'chat'
  | 'group_chat'
  | 'event';

export type SocialGuideStep =
  | 'list_intro'
  | 'list_tabs'
  | 'list_self_chat'
  | 'list_create'
  | 'list_search'
  | 'list_notifications'
  | 'connections_search'
  | 'connections_results'
  | 'connections_requests'
  | 'group_name'
  | 'group_members'
  | 'group_submit'
  | 'chat_input'
  | 'chat_emoji'
  | 'chat_image'
  | 'chat_plus'
  | 'chat_more'
  | 'group_chat_input'
  | 'group_chat_emoji'
  | 'group_chat_image'
  | 'group_chat_plus'
  | 'group_chat_events'
  | 'group_chat_create_event'
  | 'group_chat_add_to_odyssey'
  | 'event_title'
  | 'event_place'
  | 'event_when'
  | 'event_submit';

export type SocialGuideStepMeta = ChapterStepMeta<SocialGuideChapter, SocialGuideStep>;

export const SOCIAL_GUIDE_STEPS: SocialGuideStepMeta[] = [
  // The opening step has no target on purpose: a plain scrim + centred card
  // says what this tab is before pointing at anything.
  { id: 'list_intro', chapter: 'list', ringRadius: 24 },
  { id: 'list_tabs', chapter: 'list', ringRadius: 'pill' },
  { id: 'list_self_chat', chapter: 'list', ringRadius: 22 },
  { id: 'list_create', chapter: 'list', ringRadius: 'pill' },
  { id: 'list_search', chapter: 'list', ringRadius: 20 },
  { id: 'list_notifications', chapter: 'list', ringRadius: 'pill' },

  { id: 'connections_search', chapter: 'connections', ringRadius: 18 },
  { id: 'connections_results', chapter: 'connections', ringRadius: 24 },
  { id: 'connections_requests', chapter: 'connections', ringRadius: 24 },

  { id: 'group_name', chapter: 'group', ringRadius: 18 },
  { id: 'group_members', chapter: 'group', ringRadius: 24 },
  { id: 'group_submit', chapter: 'group', ringRadius: 'pill' },

  { id: 'chat_input', chapter: 'chat', ringRadius: 22 },
  { id: 'chat_emoji', chapter: 'chat', ringRadius: 'pill' },
  { id: 'chat_image', chapter: 'chat', ringRadius: 'pill' },
  { id: 'chat_plus', chapter: 'chat', ringRadius: 'pill' },
  { id: 'chat_more', chapter: 'chat', ringRadius: 'pill' },

  // A first group chat repeats the composer steps on purpose: the two chapters
  // are independent, so someone whose first conversation is a group must still
  // be told how to send a message.
  { id: 'group_chat_input', chapter: 'group_chat', ringRadius: 22 },
  { id: 'group_chat_emoji', chapter: 'group_chat', ringRadius: 'pill' },
  { id: 'group_chat_image', chapter: 'group_chat', ringRadius: 'pill' },
  { id: 'group_chat_plus', chapter: 'group_chat', ringRadius: 'pill' },
  { id: 'group_chat_events', chapter: 'group_chat', ringRadius: 20 },
  { id: 'group_chat_create_event', chapter: 'group_chat', ringRadius: 'pill' },
  { id: 'group_chat_add_to_odyssey', chapter: 'group_chat', ringRadius: 'pill' },

  { id: 'event_title', chapter: 'event', ringRadius: 18 },
  { id: 'event_place', chapter: 'event', ringRadius: 18 },
  { id: 'event_when', chapter: 'event', ringRadius: 18 },
  { id: 'event_submit', chapter: 'event', ringRadius: 'pill' },
];

export const socialGuide = createChapteredGuide<SocialGuideChapter, SocialGuideStep>({
  steps: SOCIAL_GUIDE_STEPS,
  chapters: ['list', 'connections', 'group', 'chat', 'group_chat', 'event'],
  storageKey: 'postervia.social_guide.v1',
});

export const socialStepMeta = socialGuide.stepMeta;
export const socialChapterSteps = socialGuide.chapterSteps;
export const socialStepPosition = socialGuide.stepPosition;
export const nextSocialStep = socialGuide.nextStep;
export const prevSocialStep = socialGuide.prevStep;
export const isSocialChapterLastStep = socialGuide.isChapterLastStep;
export const useSocialGuideTarget = socialGuide.useTarget;
export const measureSocialTarget = socialGuide.measureTarget;
