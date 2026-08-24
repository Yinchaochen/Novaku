import { ReactNode, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GuideStepCard, SpotlightRing, SpotlightScrim } from './spotlightParts';
import { useLanguage } from '../../context/LanguageContext';
import { GuideTargetRect, measureNode, toOverlayRect } from '../../features/guide/guideTargets';

// Registry-agnostic spotlight container: the caller hands in a measure fn for
// the currently highlighted control and the copy for the step. Used by the
// Buddy walkthrough; the Plaza walkthrough (D-050) still owns its own copy of
// this layout in GuideSpotlight and can adopt this container later.
const HOLE_PADDING = 6;
const CARD_GAP = 14;
const CARD_MARGIN_H = 16;
const MEASURE_INTERVAL_MS = 400;
// Placement falls back to this until onLayout reports the real height. It must
// never gate visibility: RN Web does not deliver the initial onLayout for this
// card, so an opacity-gated card stayed invisible forever — a dimmed screen
// with no Continue button and no way out of the tour.
// Reserve two action rows because translated labels wrap before RN Web reports onLayout.
const CARD_HEIGHT_ESTIMATE = 230;

function padRect(rect: GuideTargetRect): GuideTargetRect {
  return {
    x: rect.x - HOLE_PADDING,
    y: rect.y - HOLE_PADDING,
    width: rect.width + HOLE_PADDING * 2,
    height: rect.height + HOLE_PADDING * 2,
  };
}

function sameRect(a: GuideTargetRect | null, b: GuideTargetRect | null): boolean {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.x - b.x) < 1 &&
    Math.abs(a.y - b.y) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1
  );
}

export interface SpotlightOverlayProps {
  visible: boolean;
  /** Changes whenever the highlighted control changes — restarts measurement. */
  stepKey: string;
  measure: () => Promise<GuideTargetRect | null>;
  ringRadius: number | 'pill';
  stepNumber: number;
  stepCount: number;
  title: string;
  body: string;
  showBack: boolean;
  onBack: () => void;
  onSkipAll: () => void;
  onContinue: () => void;
  continueLabel?: string;
  testID?: string;
  cardTestID?: string;
  /** Extra layer above the scrim, e.g. a publish confirm sheet. */
  footer?: ReactNode;
}

/**
 * Where the step card goes, in the same coordinate space as `hole`.
 *
 * Extracted because the bug it now pins was invisible in review and in every
 * web render: the caller was mixing overlay coordinates with window ones, and
 * the two only differ on Android. A target hugging the bottom then looked like
 * it had room underneath, and the card went below the tab bar — ring on the
 * button, no card, no way to finish the tour.
 */
export function stepCardTop({
  hole,
  cardHeight,
  visibleBottom,
  safeTop,
}: {
  hole: { y: number; height: number } | null;
  cardHeight: number;
  visibleBottom: number;
  safeTop: number;
}): number {
  const floor = safeTop + 8;
  if (!hole) {
    return Math.max(safeTop + 24, (visibleBottom - cardHeight) / 2);
  }
  const below = hole.y + hole.height + CARD_GAP;
  const preferred =
    below + cardHeight > visibleBottom
      ? Math.max(floor, hole.y - CARD_GAP - cardHeight)
      : below;
  // Clamped at both ends. The bottom one is why this bug was filed; the top
  // one a property test found on the way — a target at y=0 put the card at 38,
  // under the status bar, in every platform including the ones that looked
  // fine. The tour is unusable the moment its only controls are unreachable,
  // and "unreachable" has two edges.
  return Math.max(floor, Math.min(preferred, Math.max(floor, visibleBottom - cardHeight)));
}


export function SpotlightOverlay({
  visible,
  stepKey,
  measure,
  ringRadius,
  stepNumber,
  stepCount,
  title,
  body,
  showBack,
  onBack,
  onSkipAll,
  onContinue,
  continueLabel,
  testID,
  cardTestID,
  footer,
}: SpotlightOverlayProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const overlayRef = useRef<View | null>(null);
  const [rect, setRect] = useState<GuideTargetRect | null>(null);
  // The overlay's own box, in window coordinates. Everything below is placed
  // in *overlay* coordinates, and on Android those are not the same thing:
  // measureInWindow gives the overlay a non-zero origin, so a bound written
  // as `windowHeight` is off by exactly that origin. Keeping the overlay's
  // own geometry lets both ends of every comparison live in one space.
  const [overlayBox, setOverlayBox] = useState<GuideTargetRect | null>(null);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const [cardHeight, setCardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => setKeyboardTop(event.endCoordinates.screenY));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardTop(null));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // The form scrolls and the keyboard moves targets around, so poll the active
  // target. Both ends go through measureInWindow so the window-origin offset
  // cancels (see toOverlayRect) — raw window coords are Android-skewed.
  useEffect(() => {
    if (!visible) {
      setRect(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      const [target, origin] = await Promise.all([measure(), measureNode(overlayRef.current)]);
      if (cancelled) return;
      const next = target ? toOverlayRect(target, origin) : null;
      setRect((prev) => (sameRect(prev, next) ? prev : next));
      setOverlayBox((prev) => (sameRect(prev, origin) ? prev : origin));
    };
    void run();
    const timer = setInterval(run, MEASURE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // `measure` is recreated per render by callers; stepKey is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, stepKey]);

  if (!visible) return null;

  const hole = rect ? padRect(rect) : null;
  const height = cardHeight || CARD_HEIGHT_ESTIMATE;
  // In overlay coordinates, which is the space `hole` and `cardTop` are in.
  // Using windowHeight here put the card below the screen on Android whenever
  // the target hugged the bottom: the "does it fit underneath?" test compared
  // an overlay-space number against a window-space one, decided it fitted,
  // and placed the card past the tab bar. The Buddy tour's last step was
  // exactly that shape — ring on the button, no card, no way to finish.
  const overlayOriginY = overlayBox?.y ?? 0;
  const overlayHeight = overlayBox?.height ?? windowHeight;
  const keyboardTopInOverlay = keyboardTop == null ? null : keyboardTop - overlayOriginY;
  const visibleBottom = (keyboardTopInOverlay ?? overlayHeight) - 8;
  const cardTop = stepCardTop({
    hole,
    cardHeight: height,
    visibleBottom,
    safeTop: insets.top,
  });

  return (
    <View
      ref={overlayRef}
      collapsable={false}
      style={[StyleSheet.absoluteFill, { zIndex: 120 }]}
      pointerEvents="box-none"
      testID={testID}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <SpotlightScrim hole={hole} />
        {hole ? <SpotlightRing hole={hole} radius={ringRadius} /> : null}
      </View>
      <GuideStepCard
        testID={cardTestID}
        stepNumber={stepNumber}
        stepCount={stepCount}
        title={title}
        body={body}
        progressTemplate={t.guide.step_progress}
        backLabel={t.guide.back_step}
        skipAllLabel={t.guide.skip_all}
        continueLabel={continueLabel ?? t.guide.continue_step}
        showBack={showBack}
        onBack={onBack}
        onSkipAll={onSkipAll}
        onContinue={onContinue}
        onLayout={setCardHeight}
        style={{
          position: 'absolute',
          left: CARD_MARGIN_H,
          right: CARD_MARGIN_H,
          top: cardTop,
        }}
      />
      {footer}
    </View>
  );
}
