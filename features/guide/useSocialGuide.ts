import { type SocialGuideChapter, socialGuide } from './socialGuide';

// Arms one chapter of the Social walkthrough for the surface that renders it:
// the tab calls it with 'list', the add-friend panel with 'connections', a
// conversation with 'chat' or 'group_chat', and so on. Auto-start fires once
// per chapter (persisted); the + menu's "getting started" row re-runs it.
export function useSocialGuide(chapter: SocialGuideChapter, enabled = true) {
  return socialGuide.useGuide(chapter, enabled);
}
