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

export function measureNode(node: MeasurableNode | null | undefined): Promise<GuideTargetRect | null> {
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

export function measureGuideTarget(step: ProductGuideStep): Promise<GuideTargetRect | null> {
  return measureNode(targets.get(step));
}

// Android's measureInWindow subtracts getWindowVisibleDisplayFrame().top (the
// status bar) from the on-screen y, while an edge-to-edge overlay's own origin
// is the physical top of the screen — so raw window coords land insets.top too
// high. Measuring the overlay with the same API and subtracting cancels that
// offset on every platform, inside a Modal window as well.
export function toOverlayRect(
  target: GuideTargetRect,
  overlayOrigin: GuideTargetRect | null,
): GuideTargetRect {
  return {
    x: target.x - (overlayOrigin?.x ?? 0),
    y: target.y - (overlayOrigin?.y ?? 0),
    width: target.width,
    height: target.height,
  };
}
