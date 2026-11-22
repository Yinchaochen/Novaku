import { SpotlightOverlay } from './SpotlightOverlay';
import { useLanguage } from '../../context/LanguageContext';
import { type ShopGuideChapter, type ShopGuideStep, shopGuide } from '../../features/guide/shopGuide';

function stepCopy(t: ReturnType<typeof useLanguage>['t'], step: ShopGuideStep): { title: string; body: string } {
  const m = t.merchant;
  const map: Record<ShopGuideStep, { title: string; body: string }> = {
    home_products: { title: m.guide_1_title, body: m.guide_1_body },
    product_photos: { title: m.guide_2_title, body: m.guide_2_body },
    product_name: { title: m.guide_3_title, body: m.guide_3_body },
    product_price: { title: m.guide_4_title, body: m.guide_4_body },
    product_publish: { title: m.guide_5_title, body: m.guide_5_body },
  };
  return map[step];
}

// The tour only points; the real "List it" button is never pressed for the owner (D-050).
export function ShopGuideSpotlight({
  chapter,
  enabled = true,
  onLastContinue,
}: {
  chapter: ShopGuideChapter;
  enabled?: boolean;
  /** Runs after the chapter's last step is acknowledged, e.g. to open the product form. */
  onLastContinue?: () => void;
}) {
  const { t } = useLanguage();
  const guide = shopGuide.useGuide(chapter, enabled);
  const step = guide.step;
  if (!step) return null;

  const { index, total } = shopGuide.stepPosition(step);
  const copy = stepCopy(t, step);
  const isLast = shopGuide.isChapterLastStep(step);

  return (
    <SpotlightOverlay
      visible
      stepKey={step}
      measure={() => shopGuide.measureTarget(step)}
      ringRadius={shopGuide.stepMeta(step).ringRadius}
      stepNumber={index + 1}
      stepCount={total}
      title={copy.title}
      body={copy.body}
      showBack={index > 0}
      onBack={guide.goBack}
      onSkipAll={guide.end}
      onContinue={() => {
        guide.advance();
        if (isLast) onLastContinue?.();
      }}
      continueLabel={isLast && chapter === 'product' ? t.merchant.guide_got_it : t.guide.continue_step}
      testID={`shop.guide.spotlight.${chapter}`}
      cardTestID={`shop.guide.step.${step}`}
    />
  );
}
