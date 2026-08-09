import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect } from 'react';
import { create } from 'zustand';

import { GuideTargetRect, MeasurableNode, measureNode } from './guideTargets';

// One walkthrough split into chapters, each explaining one surface. Buddy
// (D-054) and Social share this machine: a third hand-written copy is how the
// same geometry bug ended up needing two fixes on 2026-08-06.
//
// What a chaptered guide is: chapters are independent (entering a composer for
// the first time starts its chapter even if the tab chapter was seen weeks
// ago), progress is local-only (no funnel to report, so no server field), and
// the surface the user is actually looking at owns the tour.

export interface ChapterStepMeta<C extends string, S extends string> {
  id: S;
  chapter: C;
  // 'pill' hugs fully-rounded targets, a number is a fixed corner radius.
  ringRadius: number | 'pill';
}

export interface ChapteredGuideStoreState<C extends string, S extends string> {
  step: S | null;
  // The last step of an action chapter swaps the real submit for a confirm
  // card — the walkthrough points at the button, it never presses it.
  confirmingPublish: boolean;
  // null until AsyncStorage has been read: nothing auto-starts before then, so
  // a returning user never gets a flash of a tour they already finished.
  seen: Record<C, boolean> | null;
  hydrate: () => Promise<void>;
  start: (chapter: C) => void;
  setStep: (step: S | null) => void;
  setConfirmingPublish: (confirming: boolean) => void;
  finish: (chapter: C) => void;
  resetSeen: () => Promise<void>;
}

export interface ChapteredGuideApi<C extends string, S extends string> {
  step: S | null;
  confirmingPublish: boolean;
  advance: () => void;
  goBack: () => void;
  restart: () => void;
  end: () => void;
  requestPublishConfirm: () => void;
  cancelPublishConfirm: () => void;
}

export function createChapteredGuide<C extends string, S extends string>(config: {
  steps: ChapterStepMeta<C, S>[];
  chapters: readonly C[];
  storageKey: string;
}) {
  const { steps, chapters, storageKey } = config;

  const noneSeen = () =>
    chapters.reduce((acc, chapter) => ({ ...acc, [chapter]: false }), {} as Record<C, boolean>);

  const stepMeta = (step: S): ChapterStepMeta<C, S> =>
    steps.find((meta) => meta.id === step) as ChapterStepMeta<C, S>;

  const chapterSteps = (chapter: C): ChapterStepMeta<C, S>[] =>
    steps.filter((meta) => meta.chapter === chapter);

  const stepPosition = (step: S): { index: number; total: number } => {
    const list = chapterSteps(stepMeta(step).chapter);
    return { index: list.findIndex((meta) => meta.id === step), total: list.length };
  };

  const nextStep = (step: S): S | null => {
    const list = chapterSteps(stepMeta(step).chapter);
    return list[stepPosition(step).index + 1]?.id ?? null;
  };

  const prevStep = (step: S): S | null => {
    const list = chapterSteps(stepMeta(step).chapter);
    const { index } = stepPosition(step);
    return index > 0 ? list[index - 1].id : null;
  };

  const chapterFirstStep = (chapter: C): S => chapterSteps(chapter)[0].id;

  const isChapterLastStep = (step: S): boolean => nextStep(step) === null;

  async function persist(seen: Record<C, boolean>) {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(seen));
    } catch {
      // A failed write only costs the user one repeated tour.
    }
  }

  const useStore = create<ChapteredGuideStoreState<C, S>>((set, get) => ({
    step: null,
    confirmingPublish: false,
    seen: null,

    hydrate: async () => {
      if (get().seen) return;
      let seen = noneSeen();
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) seen = { ...seen, ...(JSON.parse(raw) as Partial<Record<C, boolean>>) };
      } catch {
        // Unreadable record → treat as "never seen" and show the tour again.
      }
      set({ seen });
    },

    start: (chapter) => set({ step: chapterFirstStep(chapter), confirmingPublish: false }),
    setStep: (step) => set({ step, confirmingPublish: false }),
    setConfirmingPublish: (confirmingPublish) => set({ confirmingPublish }),

    finish: (chapter) => {
      const seen = { ...(get().seen ?? noneSeen()), [chapter]: true };
      set({ step: null, confirmingPublish: false, seen });
      void persist(seen);
    },

    resetSeen: async () => {
      const seen = noneSeen();
      set({ step: null, confirmingPublish: false, seen });
      await persist(seen);
    },
  }));

  // Real controls register themselves here so the overlay can highlight them;
  // a module-level map (not state) so registration never re-renders anything.
  const targets = new Map<S, MeasurableNode>();

  function useTarget(step: S) {
    useEffect(() => () => {
      targets.delete(step);
    }, [step]);

    return useCallback(
      (node: MeasurableNode | null) => {
        if (node) targets.set(step, node);
        else targets.delete(step);
      },
      [step],
    );
  }

  const measureTarget = (step: S): Promise<GuideTargetRect | null> =>
    measureNode(targets.get(step));

  /**
   * Arms one chapter for the surface that renders it. Auto-start fires once per
   * chapter (persisted); a header entry can re-run it any time via `restart`.
   */
  function useGuide(chapter: C, enabled = true): ChapteredGuideApi<C, S> {
    const step = useStore((state) => state.step);
    const confirmingPublish = useStore((state) => state.confirmingPublish);
    const seen = useStore((state) => state.seen);
    const hydrate = useStore((state) => state.hydrate);
    const start = useStore((state) => state.start);
    const setStep = useStore((state) => state.setStep);
    const setConfirmingPublish = useStore((state) => state.setConfirmingPublish);
    const finish = useStore((state) => state.finish);

    useEffect(() => {
      void hydrate();
    }, [hydrate]);

    useEffect(() => {
      if (!enabled || !seen || seen[chapter]) return;
      const current = useStore.getState().step;
      if (current) {
        const openChapter = stepMeta(current).chapter;
        if (openChapter === chapter) return;
        // Another surface left its chapter open (tapping + on the last list
        // step walks straight into a composer). The surface the user is
        // actually looking at owns the tour, otherwise its chapter could never
        // start. The abandoned one only counts as seen if it reached its end.
        if (isChapterLastStep(current)) finish(openChapter);
      }
      start(chapter);
    }, [enabled, seen, chapter, start, finish]);

    // The active step only belongs to this surface when it is in this chapter —
    // the store is shared so a composer's steps never paint on the list.
    const activeStep = step && stepMeta(step).chapter === chapter ? step : null;

    const advance = () => {
      const current = useStore.getState().step;
      if (!current) return;
      const next = nextStep(current);
      if (next) setStep(next);
      else finish(chapter);
    };

    const goBack = () => {
      const current = useStore.getState().step;
      if (!current) return;
      const prev = prevStep(current);
      if (prev) setStep(prev);
    };

    return {
      step: activeStep,
      confirmingPublish,
      advance,
      goBack,
      restart: () => start(chapter),
      // Skipping and finishing are the same move: the chapter is marked seen.
      end: () => finish(chapter),
      requestPublishConfirm: () => setConfirmingPublish(true),
      cancelPublishConfirm: () => setConfirmingPublish(false),
    };
  }

  return {
    steps,
    stepMeta,
    chapterSteps,
    stepPosition,
    nextStep,
    prevStep,
    chapterFirstStep,
    isChapterLastStep,
    useTarget,
    measureTarget,
    useStore,
    useGuide,
  };
}
