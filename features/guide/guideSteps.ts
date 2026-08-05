import type { ProductGuideStep } from '../../store/guideStore';

export type GuideLayer = 'plaza' | 'composer';

export interface GuideStepMeta {
  id: ProductGuideStep;
  // Which surface renders this step's overlay: the plaza screen itself or the
  // composer Modal (a RN Modal is its own native layer, so each surface
  // mounts its own <GuideSpotlight layer=…>).
  layer: GuideLayer;
  // Back is only offered between composer steps; stepping back to a step
  // whose layer is off-screen would strand the walkthrough invisibly.
  canGoBack: boolean;
  // 'pill' hugs fully-rounded targets, a number is a fixed corner radius.
  ringRadius: number | 'pill';
}

export const GUIDE_STEPS: GuideStepMeta[] = [
  { id: 'compose_entry', layer: 'plaza', canGoBack: false, ringRadius: 'pill' },
  { id: 'photo', layer: 'composer', canGoBack: false, ringRadius: 28 },
  { id: 'title', layer: 'composer', canGoBack: true, ringRadius: 16 },
  { id: 'body', layer: 'composer', canGoBack: true, ringRadius: 16 },
  { id: 'location', layer: 'composer', canGoBack: true, ringRadius: 'pill' },
  { id: 'publish', layer: 'composer', canGoBack: true, ringRadius: 'pill' },
];

export function guideStepIndex(step: ProductGuideStep): number {
  return GUIDE_STEPS.findIndex((meta) => meta.id === step);
}

export function guideStepMeta(step: ProductGuideStep): GuideStepMeta {
  return GUIDE_STEPS[guideStepIndex(step)];
}

export function nextGuideStep(step: ProductGuideStep): ProductGuideStep | null {
  const index = guideStepIndex(step);
  return GUIDE_STEPS[index + 1]?.id ?? null;
}

export function prevGuideStep(step: ProductGuideStep): ProductGuideStep | null {
  const index = guideStepIndex(step);
  return index > 0 ? GUIDE_STEPS[index - 1].id : null;
}

export function isComposerStep(step: ProductGuideStep): boolean {
  return guideStepMeta(step).layer === 'composer';
}
