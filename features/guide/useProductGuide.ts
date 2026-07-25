import { useEffect } from 'react';

import {
  CURRENT_PRODUCT_GUIDE_VERSION,
  useRecordProductGuideEvent,
  useUpdateProductGuide,
} from '../auth/useAuth';
import { useAuthStore } from '../../store/authStore';
import { useProductGuideStore } from '../../store/guideStore';

// Mounted once in the tabs layout: arms the guide for users who finished
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
    setStep('odyssey');
    recordEvent.mutate({ event: 'started' });
    // recordEvent is a stable mutation object per render; deps below are the
    // real triggers (login, onboarding completion, settings re-arm).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingCompleted, guideVersion, hasStartedThisSession]);
}

export function useProductGuide() {
  const step = useProductGuideStore((state) => state.step);
  const setStep = useProductGuideStore((state) => state.setStep);
  const markStarted = useProductGuideStore((state) => state.markStarted);
  const updateGuide = useUpdateProductGuide();
  const recordEvent = useRecordProductGuideEvent();

  const completeOdysseyStep = (detail: 'action' | 'dismiss') => {
    if (step !== 'odyssey') return;
    setStep('plaza');
    recordEvent.mutate({ event: 'odyssey_step_done', detail });
  };

  const completePlazaStep = (detail: 'action' | 'dismiss') => {
    if (step !== 'plaza') return;
    setStep(null);
    recordEvent.mutate({ event: 'plaza_step_done', detail });
    updateGuide.mutate({ product_guide_version: CURRENT_PRODUCT_GUIDE_VERSION });
  };

  const skipAll = () => {
    if (!step) return;
    setStep(null);
    recordEvent.mutate({ event: 'skipped' });
    updateGuide.mutate({ product_guide_version: CURRENT_PRODUCT_GUIDE_VERSION });
  };

  // Settings → "view the guide again": re-arm on the server, restart locally.
  const restart = () => {
    markStarted();
    setStep('odyssey');
    updateGuide.mutate({ product_guide_version: 0 });
    recordEvent.mutate({ event: 'started' });
  };

  return { step, completeOdysseyStep, completePlazaStep, skipAll, restart };
}
