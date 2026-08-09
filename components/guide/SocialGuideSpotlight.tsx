import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GuidePublishConfirmCard } from './spotlightParts';
import { SpotlightOverlay } from './SpotlightOverlay';
import { useLanguage } from '../../context/LanguageContext';
import {
  type SocialGuideChapter,
  type SocialGuideStep,
  isSocialChapterLastStep,
  measureSocialTarget,
  socialStepMeta,
  socialStepPosition,
} from '../../features/guide/socialGuide';
import { useSocialGuide } from '../../features/guide/useSocialGuide';

// Copy lives in i18n under social_guide.<step>_{title,body}; keyed explicitly so
// a missing step is a type error rather than a blank card. The four group_chat
// composer steps deliberately point at the chat copy — same control, same
// explanation, one set of strings to translate.
function stepCopy(
  t: ReturnType<typeof useLanguage>['t'],
  step: SocialGuideStep,
): { title: string; body: string } {
  const g = t.social_guide;
  const map: Record<SocialGuideStep, { title: string; body: string }> = {
    list_intro: { title: g.list_intro_title, body: g.list_intro_body },
    list_tabs: { title: g.list_tabs_title, body: g.list_tabs_body },
    list_self_chat: { title: g.list_self_chat_title, body: g.list_self_chat_body },
    list_create: { title: g.list_create_title, body: g.list_create_body },
    list_search: { title: g.list_search_title, body: g.list_search_body },
    list_notifications: { title: g.list_notifications_title, body: g.list_notifications_body },

    connections_search: { title: g.connections_search_title, body: g.connections_search_body },
    connections_results: { title: g.connections_results_title, body: g.connections_results_body },
    connections_requests: { title: g.connections_requests_title, body: g.connections_requests_body },

    group_name: { title: g.group_name_title, body: g.group_name_body },
    group_members: { title: g.group_members_title, body: g.group_members_body },
    group_submit: { title: g.group_submit_title, body: g.group_submit_body },

    chat_input: { title: g.chat_input_title, body: g.chat_input_body },
    chat_emoji: { title: g.chat_emoji_title, body: g.chat_emoji_body },
    chat_image: { title: g.chat_image_title, body: g.chat_image_body },
    chat_plus: { title: g.chat_plus_title, body: g.chat_plus_body },
    chat_more: { title: g.chat_more_title, body: g.chat_more_body },

    group_chat_input: { title: g.chat_input_title, body: g.chat_input_body },
    group_chat_emoji: { title: g.chat_emoji_title, body: g.chat_emoji_body },
    group_chat_image: { title: g.chat_image_title, body: g.chat_image_body },
    group_chat_plus: { title: g.chat_plus_title, body: g.chat_plus_body },
    group_chat_events: { title: g.group_events_title, body: g.group_events_body },
    group_chat_create_event: { title: g.group_create_event_title, body: g.group_create_event_body },
    group_chat_add_to_odyssey: {
      title: g.group_add_to_odyssey_title,
      body: g.group_add_to_odyssey_body,
    },

    event_title: { title: g.event_title_title, body: g.event_title_body },
    event_place: { title: g.event_place_title, body: g.event_place_body },
    event_when: { title: g.event_when_title, body: g.event_when_body },
    event_submit: { title: g.event_submit_title, body: g.event_submit_body },
  };
  return map[step];
}

export function SocialGuideSpotlight({
  chapter,
  enabled = true,
  onConfirmSubmit,
}: {
  chapter: SocialGuideChapter;
  /** Modal surfaces arm their chapter only while they are actually open. */
  enabled?: boolean;
  /** Form chapters: dispatches the real submit after the confirm card. */
  onConfirmSubmit?: () => void;
}) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const guide = useSocialGuide(chapter, enabled);
  const step = guide.step;

  if (!step) return null;

  const { index, total } = socialStepPosition(step);
  const copy = stepCopy(t, step);
  const showConfirm = guide.confirmingPublish && isSocialChapterLastStep(step);
  // Social creates a group or a meetup, never "publishes a post" — the shared
  // guide.confirm_publish_* copy would be lying about what the button does.
  const isEvent = chapter === 'event';
  const confirm = {
    title: isEvent ? t.social_guide.confirm_event_title : t.social_guide.confirm_group_title,
    body: isEvent ? t.social_guide.confirm_event_body : t.social_guide.confirm_group_body,
    cta: isEvent ? t.social_guide.confirm_event_cta : t.social_guide.confirm_group_cta,
  };

  return (
    <SpotlightOverlay
      visible
      stepKey={step}
      measure={() => measureSocialTarget(step)}
      ringRadius={socialStepMeta(step).ringRadius}
      stepNumber={index + 1}
      stepCount={total}
      title={copy.title}
      body={copy.body}
      showBack={index > 0}
      onBack={guide.goBack}
      onSkipAll={guide.end}
      onContinue={guide.advance}
      testID={`social.guide.spotlight.${chapter}`}
      cardTestID={`social.guide.step.${step}`}
      footer={
        showConfirm ? (
          <View style={StyleSheet.absoluteFill}>
            <Pressable
              accessibilityLabel={t.guide.confirm_publish_back}
              onPress={guide.cancelPublishConfirm}
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(36, 26, 22, 0.30)' }]}
            />
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                paddingBottom: Math.max(insets.bottom, 16) + 8,
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
              }}
            >
              <GuidePublishConfirmCard
                testID="social.guide.confirm-sheet"
                title={confirm.title}
                body={confirm.body}
                confirmLabel={confirm.cta}
                cancelLabel={t.guide.confirm_publish_back}
                onConfirm={() => {
                  guide.cancelPublishConfirm();
                  onConfirmSubmit?.();
                }}
                onCancel={guide.cancelPublishConfirm}
              />
            </View>
          </View>
        ) : null
      }
    />
  );
}
