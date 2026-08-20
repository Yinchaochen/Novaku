import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GuidePublishConfirmCard } from './spotlightParts';
import { SpotlightOverlay } from './SpotlightOverlay';
import { useLanguage } from '../../context/LanguageContext';
import {
  type BuddyGuideChapter,
  type BuddyGuideStep,
  buddyStepMeta,
  buddyStepPosition,
  isBuddyChapterLastStep,
  measureBuddyTarget,
} from '../../features/guide/buddyGuide';
import { useBuddyGuide } from '../../features/guide/useBuddyGuide';

// Copy lives in i18n under buddy_guide.<step>_{title,body}; keyed explicitly so
// a missing step is a type error rather than a blank card.
function stepCopy(
  t: ReturnType<typeof useLanguage>['t'],
  step: BuddyGuideStep,
): { title: string; body: string } {
  const g = t.buddy_guide;
  const map: Record<BuddyGuideStep, { title: string; body: string }> = {
    feed_intro: { title: g.feed_intro_title, body: g.feed_intro_body },
    feed_categories: { title: g.feed_categories_title, body: g.feed_categories_body },
    feed_saved: { title: g.feed_saved_title, body: g.feed_saved_body },
    feed_create: { title: g.feed_create_title, body: g.feed_create_body },
    wish_photos: { title: g.wish_photos_title, body: g.wish_photos_body },
    wish_description: { title: g.wish_description_title, body: g.wish_description_body },
    wish_dates: { title: g.wish_dates_title, body: g.wish_dates_body },
    wish_where_to_buy: { title: g.wish_where_to_buy_title, body: g.wish_where_to_buy_body },
    wish_deliver_to: { title: g.wish_deliver_to_title, body: g.wish_deliver_to_body },
    wish_shipping: { title: g.wish_shipping_title, body: g.wish_shipping_body },
    wish_price: { title: g.wish_price_title, body: g.wish_price_body },
    wish_publish: { title: g.wish_publish_title, body: g.wish_publish_body },
    companion_category: { title: g.companion_category_title, body: g.companion_category_body },
    companion_title: { title: g.companion_title_title, body: g.companion_title_body },
    companion_body: { title: g.companion_body_title, body: g.companion_body_body },
    companion_when: { title: g.companion_when_title, body: g.companion_when_body },
    companion_city: { title: g.companion_city_title, body: g.companion_city_body },
    companion_price: { title: g.companion_price_title, body: g.companion_price_body },
    companion_publish: { title: g.companion_publish_title, body: g.companion_publish_body },
  };
  return map[step];
}

export function BuddyGuideSpotlight({
  chapter,
  onConfirmPublish,
}: {
  chapter: BuddyGuideChapter;
  /** Composer chapters: dispatches the real submit after the confirm card. */
  onConfirmPublish?: () => void;
}) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const guide = useBuddyGuide(chapter);
  const step = guide.step;

  if (!step) return null;

  const { index, total } = buddyStepPosition(step);
  const copy = stepCopy(t, step);
  const isLastStep = isBuddyChapterLastStep(step);
  const showConfirm = guide.confirmingPublish && isLastStep;

  return (
    <SpotlightOverlay
      visible
      stepKey={step}
      measure={() => measureBuddyTarget(step)}
      ringRadius={buddyStepMeta(step).ringRadius}
      stepNumber={index + 1}
      stepCount={total}
      title={copy.title}
      body={copy.body}
      showBack={index > 0}
      onBack={guide.goBack}
      onSkipAll={guide.end}
      onContinue={guide.advance}
      continueLabel={isLastStep ? t.guide.finish_tour : t.guide.continue_step}
      testID={`buddy.guide.spotlight.${chapter}`}
      cardTestID={`buddy.guide.step.${step}`}
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
                testID="buddy.guide.confirm-sheet"
                title={t.guide.confirm_publish_title}
                body={t.buddy_guide.confirm_publish_body}
                confirmLabel={t.guide.confirm_publish_cta}
                cancelLabel={t.guide.confirm_publish_back}
                onConfirm={() => {
                  guide.cancelPublishConfirm();
                  onConfirmPublish?.();
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
