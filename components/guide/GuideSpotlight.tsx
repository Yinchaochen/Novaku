import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpotlightOverlay } from './SpotlightOverlay';
import { GuidePublishConfirmCard } from './spotlightParts';
import { useLanguage } from '../../context/LanguageContext';
import { GuideLayer, guideStepIndex, guideStepMeta, GUIDE_STEPS } from '../../features/guide/guideSteps';
import { measureGuideTarget } from '../../features/guide/guideTargets';
import { useProductGuide } from '../../features/guide/useProductGuide';
import { ProductGuideStep, useProductGuideStore } from '../../store/guideStore';

// Copy lives in i18n under guide.<step>_{title,body}; keyed explicitly so a
// missing step is a type error rather than a blank card.
function stepCopy(
  t: ReturnType<typeof useLanguage>['t'],
  step: ProductGuideStep,
): { title: string; body: string } {
  const g = t.guide;
  const map: Record<ProductGuideStep, { title: string; body: string }> = {
    compose_entry: { title: g.compose_entry_title, body: g.compose_entry_body },
    photo: { title: g.photo_step_title, body: g.photo_step_body },
    title: { title: g.title_step_title, body: g.title_step_body },
    body: { title: g.body_step_title, body: g.body_step_body },
    location: { title: g.location_step_title, body: g.location_step_body },
    publish: { title: g.publish_step_title, body: g.publish_step_body },
  };
  return map[step];
}

// Plaza walkthrough (D-050) adapter over the shared SpotlightOverlay: supplies
// the step's copy, its forward action and the publish confirm sheet (as the
// overlay's footer). plaza.tsx mounts it twice — on the screen (compose_entry)
// and inside the composer Modal (all other steps), because a RN Modal is its
// own native window and a screen-level overlay can never paint above it.
export function GuideSpotlight({
  layer,
  onContinueFromEntry,
  onContinueFromPublish,
  onConfirmPublish,
}: {
  layer: GuideLayer;
  /** plaza layer: performs the entry step's forward action (open composer). */
  onContinueFromEntry?: () => void;
  /** composer layer: final Continue — finish the tour and return to Plaza. */
  onContinueFromPublish?: () => void;
  onConfirmPublish?: () => void;
}) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const step = useProductGuideStore((state) => state.step);
  const confirmingPublish = useProductGuideStore((state) => state.confirmingPublish);
  const guide = useProductGuide();

  const meta = step ? guideStepMeta(step) : null;
  if (!step || !meta || meta.layer !== layer) return null;

  const copy = stepCopy(t, step);
  const showConfirm = step === 'publish' && confirmingPublish;

  // "Continue" always moves forward: the entry step opens the composer
  // (host-provided), the final step finishes the tour and returns to Plaza
  // (host-provided — the publish confirm sheet belongs to the real publish
  // button only), every other step simply advances the highlight.
  const handleContinue = () => {
    if (step === 'compose_entry') {
      onContinueFromEntry?.();
      return;
    }
    if (step === 'publish') {
      onContinueFromPublish?.();
      return;
    }
    guide.advanceFrom(step);
  };

  return (
    <SpotlightOverlay
      visible
      stepKey={step}
      measure={() => measureGuideTarget(step)}
      ringRadius={meta.ringRadius}
      stepNumber={guideStepIndex(step) + 1}
      stepCount={GUIDE_STEPS.length}
      title={copy.title}
      body={copy.body}
      showBack={meta.canGoBack}
      onBack={guide.goBackStep}
      onSkipAll={guide.skipAll}
      onContinue={handleContinue}
      testID={`guide.spotlight.${layer}`}
      cardTestID={`guide.step.${step}`}
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
                testID="guide.confirm-sheet"
                title={t.guide.confirm_publish_title}
                body={t.guide.confirm_publish_body}
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
