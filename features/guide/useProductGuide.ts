import { useEffect } from 'react';

import {
  CURRENT_PRODUCT_GUIDE_VERSION,
  useRecordProductGuideEvent,
  useUpdateProductGuide,
} from '../auth/useAuth';
import { useAuthStore } from '../../store/authStore';
import { ProductGuideStep, useProductGuideStore } from '../../store/guideStore';
import { guideStepMeta, isComposerStep, nextGuideStep, prevGuideStep } from './guideSteps';

// Mirrors the zod schema mins in app/(tabs)/plaza.tsx: the walkthrough only
// advances past a text step once the input would actually pass validation.
const MIN_TITLE_LENGTH = 4;
const MIN_BODY_LENGTH = 12;
const TEXT_ADVANCE_DEBOUNCE_MS = 450;

// Mounted once in the tabs layout: arms the walkthrough for users who finished
// onboarding but have not completed/skipped the current guide version.
export function useProductGuideController() {
  const user = useAuthStore((state) => state.user);
  const hasStartedThisSession = useProductGuideStore((state) => state.hasStartedThisSession);
  const setStep = useProductGuideStore((state) => state.setStep);
  const markStarted = useProductGuideStore((state) => state.markStarted);
  const recordEvent = useRecordProductGuideEvent();

  const onboardingCompleted = Boolean(user?.onboarding_completed);
  const guideVersion = user?.product_guide_version ?? 0;

  useEffect(() => {
    if (!onboardingCompleted) return;
    if (guideVersion >= CURRENT_PRODUCT_GUIDE_VERSION) return;
    if (hasStartedThisSession) return;
    markStarted();
    setStep('compose_entry');
    recordEvent.mutate({ event: 'started' });
    // recordEvent is a stable mutation object per render; deps below are the
    // real triggers (login, onboarding completion, settings re-arm).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingCompleted, guideVersion, hasStartedThisSession]);
}

export function useProductGuide() {
  const step = useProductGuideStore((state) => state.step);
  const confirmingPublish = useProductGuideStore((state) => state.confirmingPublish);
  const setStep = useProductGuideStore((state) => state.setStep);
  const setConfirmingPublish = useProductGuideStore((state) => state.setConfirmingPublish);
  const markStarted = useProductGuideStore((state) => state.markStarted);
  const user = useAuthStore((state) => state.user);
  const updateGuide = useUpdateProductGuide();
  const recordEvent = useRecordProductGuideEvent();

  // Manual re-walks (plaza header entry after completion) stay purely local:
  // server version + funnel events only move while the guide is armed.
  const armed = (user?.product_guide_version ?? 0) < CURRENT_PRODUCT_GUIDE_VERSION;

  const endWalkthrough = (event: 'plaza_step_done' | 'skipped', detail?: 'action' | 'dismiss') => {
    setStep(null);
    if (!armed) return;
    recordEvent.mutate(detail ? { event, detail } : { event });
    updateGuide.mutate({ product_guide_version: CURRENT_PRODUCT_GUIDE_VERSION });
  };

  // Actions read live store state (not the subscribed snapshot): they fire
  // from debounce timers and freshly-mutated store states where a render
  // closure would be stale.
  const advanceFrom = (from: ProductGuideStep) => {
    const current = useProductGuideStore.getState();
    if (current.step !== from) return;
    const next = nextGuideStep(from);
    if (!next) return;
    setStep(next);
  };

  const goBackStep = () => {
    const current = useProductGuideStore.getState();
    if (!current.step) return;
    if (!guideStepMeta(current.step).canGoBack) return;
    const prev = prevGuideStep(current.step);
    if (prev) setStep(prev);
  };

  // Permanent plaza-header entry ("带我操作"): starts — or restarts — the
  // walkthrough locally at the surface the user is currently on.
  const startWalkthrough = (options?: { composerOpen?: boolean }) => {
    markStarted();
    setStep(options?.composerOpen ? 'photo' : 'compose_entry');
  };

  // 'action' = the guided publish confirm dispatched a real submit;
  // 'dismiss' = the user finished the tour via the final Continue without
  // publishing. Both count as walkthrough completion server-side.
  const completeWalkthrough = (detail: 'action' | 'dismiss') => {
    if (!useProductGuideStore.getState().step) return;
    endWalkthrough('plaza_step_done', detail);
  };

  const skipAll = () => {
    if (!useProductGuideStore.getState().step) return;
    endWalkthrough('skipped');
  };

  // Settings → "view the guide again": re-arm on the server, restart locally.
  const restart = () => {
    markStarted();
    setStep('compose_entry');
    updateGuide.mutate({ product_guide_version: 0 });
    recordEvent.mutate({ event: 'started' });
  };

  const shouldInterceptPublish = step === 'publish';
  const requestPublishConfirm = () => setConfirmingPublish(true);
  const cancelPublishConfirm = () => setConfirmingPublish(false);

  return {
    step,
    confirmingPublish,
    advanceFrom,
    goBackStep,
    startWalkthrough,
    completeWalkthrough,
    skipAll,
    restart,
    shouldInterceptPublish,
    requestPublishConfirm,
    cancelPublishConfirm,
  };
}

// Watches the real composer state from plaza.tsx and advances the walkthrough
// when the user performs each step's actual action — the guide never fakes
// progress, it follows what really happened.
export function useGuideAutoAdvance(input: {
  composerVisible: boolean;
  mediaCount: number;
  title: string;
  body: string;
  placesCount: number;
}) {
  const step = useProductGuideStore((state) => state.step);
  const setStep = useProductGuideStore((state) => state.setStep);
  const { advanceFrom } = useProductGuide();

  // Opening the composer is the real action for 'compose_entry'; conversely a
  // composer-layer step whose surface disappeared restarts from the entry so
  // the walkthrough can never idle on an invisible step.
  useEffect(() => {
    if (input.composerVisible) {
      advanceFrom('compose_entry');
      return;
    }
    const current = useProductGuideStore.getState().step;
    if (current && isComposerStep(current)) {
      setStep('compose_entry');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.composerVisible]);

  useEffect(() => {
    if (input.mediaCount > 0) advanceFrom('photo');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.mediaCount]);

  useEffect(() => {
    if (step !== 'title') return;
    if (input.title.trim().length < MIN_TITLE_LENGTH) return;
    const timer = setTimeout(() => advanceFrom('title'), TEXT_ADVANCE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.title, step]);

  useEffect(() => {
    if (step !== 'body') return;
    if (input.body.trim().length < MIN_BODY_LENGTH) return;
    const timer = setTimeout(() => advanceFrom('body'), TEXT_ADVANCE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.body, step]);

  useEffect(() => {
    if (input.placesCount > 0) advanceFrom('location');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.placesCount]);
}
