import { useCallback, useEffect } from 'react';

import type { ProductGuideStep } from '../../store/guideStore';

// The spotlight highlights *real* controls, so the controls register
// themselves here and the overlay measures them in window coordinates.
// A plain module-level map (not state) — rects are polled by the overlay
// while it is visible, nothing re-renders on registration.
export interface MeasurableNode {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
}

export interface GuideTargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const targets = new Map<ProductGuideStep, MeasurableNode>();

export function useGuideTarget(step: ProductGuideStep) {
  useEffect(() => () => {
    targets.delete(step);
  }, [step]);

  return useCallback(
    (node: MeasurableNode | null) => {
      if (node) {
        targets.set(step, node);
      } else {
        targets.delete(step);
      }
    },
    [step],
  );
}

export function measureGuideTarget(step: ProductGuideStep): Promise<GuideTargetRect | null> {
  const node = targets.get(step);
  if (!node || typeof node.measureInWindow !== 'function') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      node.measureInWindow((x, y, width, height) => {
        resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
      });
    } catch {
      resolve(null);
    }
  });
}
