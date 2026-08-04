import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedbackPressable } from '../FeedbackPressable';
import { useLanguage } from '../../context/LanguageContext';
import { GuideLayer, guideStepIndex, guideStepMeta, GUIDE_STEPS } from '../../features/guide/guideSteps';
import { GuideTargetRect, measureGuideTarget } from '../../features/guide/guideTargets';
import { useProductGuide } from '../../features/guide/useProductGuide';
import { ProductGuideStep, useProductGuideStore } from '../../store/guideStore';
import { colors, shadows, typography } from '../../theme/tokens';

// Variant A of the reviewed prototype (outputs/onboarding-highlight-prototype)
// with variant B's anchored explanation card: strong scrim, coral ring around
// the real control, step card next to it. The scrim is pointerEvents:none by
// design — the walkthrough points, it never locks the UI.
const SCRIM_COLOR = 'rgba(36, 26, 22, 0.60)';
const HOLE_PADDING = 6;
const CARD_GAP = 14;
const CARD_MARGIN_H = 16;
const MEASURE_INTERVAL_MS = 400;

interface GuideHole extends GuideTargetRect {}

function padRect(rect: GuideTargetRect): GuideHole {
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

// Four opaque rects around the hole: the target itself stays bright and — the
// scrim never receiving touches — fully tappable.
export function SpotlightScrim({ hole }: { hole: GuideHole | null }) {
  if (!hole) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM_COLOR }]} />;
  }
  const left = Math.max(hole.x, 0);
  const top = Math.max(hole.y, 0);
  return (
    <>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: top, backgroundColor: SCRIM_COLOR }} />
      <View style={{ position: 'absolute', left: 0, width: left, top, height: hole.height, backgroundColor: SCRIM_COLOR }} />
      <View
        style={{
          position: 'absolute',
          left: left + hole.width,
          right: 0,
          top,
          height: hole.height,
          backgroundColor: SCRIM_COLOR,
        }}
      />
      <View
        style={{ position: 'absolute', left: 0, right: 0, top: top + hole.height, bottom: 0, backgroundColor: SCRIM_COLOR }}
      />
    </>
  );
}

// Coral ring + soft white halo around the hole, with a gentle breathing pulse.
export function SpotlightRing({ hole, radius }: { hole: GuideHole; radius: number | 'pill' }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const ringRadius = radius === 'pill' ? hole.height / 2 : radius;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: hole.x,
        top: hole.y,
        width: hole.width,
        height: hole.height,
        transform: [{ scale }],
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: -8,
          top: -8,
          right: -8,
          bottom: -8,
          borderWidth: 3,
          borderColor: 'rgba(255, 255, 255, 0.92)',
          borderRadius: ringRadius + 8,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: -3,
          top: -3,
          right: -3,
          bottom: -3,
          borderWidth: 3,
          borderColor: colors.brandCoral,
          borderRadius: ringRadius + 3,
        }}
      />
    </Animated.View>
  );
}

interface GuideStepCardProps {
  stepNumber: number;
  stepCount: number;
  title: string;
  body: string;
  backLabel: string;
  skipAllLabel: string;
  continueLabel: string;
  showBack: boolean;
  onBack: () => void;
  onSkipAll: () => void;
  onContinue: () => void;
  progressTemplate: string;
  testID?: string;
  onLayout?: (height: number) => void;
  style?: object;
}

function CardLink({
  label,
  tone,
  onPress,
  testID,
}: {
  label: string;
  tone: 'primary' | 'muted';
  onPress: () => void;
  testID?: string;
}) {
  return (
    <FeedbackPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      hitSlop={6}
      style={{ minHeight: 44, justifyContent: 'center' }}
      pressedStyle={{ opacity: 0.7 }}
    >
      <Text
        style={[
          typography.caption,
          {
            color: tone === 'primary' ? colors.brandCoral : colors.textMuted,
            fontWeight: '700',
          },
        ]}
      >
        {label}
      </Text>
    </FeedbackPressable>
  );
}

export function GuideStepCard({
  stepNumber,
  stepCount,
  title,
  body,
  backLabel,
  skipAllLabel,
  continueLabel,
  showBack,
  onBack,
  onSkipAll,
  onContinue,
  progressTemplate,
  testID,
  onLayout,
  style,
}: GuideStepCardProps) {
  const progress = progressTemplate
    .replace('{current}', String(stepNumber))
    .replace('{total}', String(stepCount));
  return (
    <View
      testID={testID}
      onLayout={onLayout ? (event) => onLayout(event.nativeEvent.layout.height) : undefined}
      style={[
        {
          borderRadius: 22,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: 'rgba(98, 57, 40, 0.08)',
          paddingHorizontal: 16,
          paddingTop: 15,
          paddingBottom: 8,
          ...shadows.cta,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: colors.brandCoral,
          fontSize: 11,
          fontWeight: '900',
          letterSpacing: 0.8,
        }}
      >
        {progress}
      </Text>
      <Text style={[typography.bodyStrong, { color: colors.textMain, marginTop: 4 }]}>{title}</Text>
      <Text style={[typography.body, { color: colors.textMuted, marginTop: 4, lineHeight: 19 }]}>{body}</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          columnGap: 14,
          marginTop: 2,
        }}
      >
        {showBack ? <CardLink label={backLabel} tone="primary" onPress={onBack} testID="guide.card.back" /> : null}
        <CardLink label={skipAllLabel} tone="muted" onPress={onSkipAll} testID="guide.card.skip-all" />
        <View style={{ flex: 1 }} />
        {/* Filled pill (not a text link) so its tappability is obvious:
            Continue always moves the walkthrough forward. */}
        <FeedbackPressable
          accessibilityRole="button"
          accessibilityLabel={continueLabel}
          onPress={onContinue}
          testID="guide.card.continue"
          hitSlop={8}
          style={{
            minHeight: 36,
            justifyContent: 'center',
            borderRadius: 999,
            paddingHorizontal: 16,
            marginVertical: 4,
            backgroundColor: colors.brandCoral,
          }}
          pressedStyle={{ opacity: 0.85 }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{continueLabel}</Text>
        </FeedbackPressable>
      </View>
    </View>
  );
}

export function GuidePublishConfirmCard({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  testID,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={{
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 22,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textMain }}>{title}</Text>
      <Text style={[typography.body, { color: colors.textMuted, marginTop: 7, lineHeight: 20 }]}>{body}</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <FeedbackPressable
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
          onPress={onCancel}
          testID="guide.confirm.cancel"
          style={{
            flex: 1,
            height: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(232, 221, 210, 0.92)',
            backgroundColor: '#FFFFFF',
          }}
          pressedStyle={{ opacity: 0.8 }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textMain }}>{cancelLabel}</Text>
        </FeedbackPressable>
        <FeedbackPressable
          accessibilityRole="button"
          accessibilityLabel={confirmLabel}
          onPress={onConfirm}
          testID="guide.confirm.publish"
          style={{
            flex: 1,
            height: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.brandCoral,
          }}
          pressedStyle={{ opacity: 0.85 }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>{confirmLabel}</Text>
        </FeedbackPressable>
      </View>
    </View>
  );
}

// Container: wires the store, target measurement and i18n copy for one layer.
// plaza.tsx mounts it twice — on the screen (compose_entry) and inside the
// composer Modal (all other steps), because a RN Modal is its own native
// window and a screen-level overlay can never paint above it.
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
  const { height: windowHeight } = useWindowDimensions();
  const step = useProductGuideStore((state) => state.step);
  const confirmingPublish = useProductGuideStore((state) => state.confirmingPublish);
  const guide = useProductGuide();
  const [rect, setRect] = useState<GuideTargetRect | null>(null);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const [cardHeight, setCardHeight] = useState(0);

  const meta = step ? guideStepMeta(step) : null;
  const visible = Boolean(step && meta?.layer === layer);

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

  // The composer scrolls and the keyboard moves targets around, so poll the
  // active target instead of trying to subscribe to every layout change.
  useEffect(() => {
    if (!visible || !step) {
      setRect(null);
      return;
    }
    let cancelled = false;
    const measure = async () => {
      const next = await measureGuideTarget(step);
      if (cancelled) return;
      setRect((prev) => (sameRect(prev, next) ? prev : next));
    };
    void measure();
    const timer = setInterval(measure, MEASURE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [visible, step]);

  if (!visible || !step || !meta) return null;

  const stepCopy: Record<ProductGuideStep, { title: string; body: string }> = {
    compose_entry: { title: t.guide.compose_entry_title, body: t.guide.compose_entry_body },
    photo: { title: t.guide.photo_step_title, body: t.guide.photo_step_body },
    title: { title: t.guide.title_step_title, body: t.guide.title_step_body },
    body: { title: t.guide.body_step_title, body: t.guide.body_step_body },
    location: { title: t.guide.location_step_title, body: t.guide.location_step_body },
    publish: { title: t.guide.publish_step_title, body: t.guide.publish_step_body },
  };

  // "Continue" always moves forward: the entry step opens the composer
  // (host-provided), the final step finishes the tour and returns to Plaza
  // (host-provided — the publish confirm sheet belongs to the real publish
  // button only), every other step simply advances the highlight.
  const handleContinue = () => {
    if (!step) return;
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

  const hole = rect ? padRect(rect) : null;
  const visibleBottom = (keyboardTop ?? windowHeight) - 8;
  let cardTop: number;
  if (!hole) {
    cardTop = Math.max(insets.top + 24, (visibleBottom - cardHeight) / 2);
  } else {
    const below = hole.y + hole.height + CARD_GAP;
    cardTop =
      cardHeight > 0 && below + cardHeight > visibleBottom
        ? Math.max(insets.top + 8, hole.y - CARD_GAP - cardHeight)
        : below;
  }

  const showConfirm = step === 'publish' && confirmingPublish;

  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 120 }]}
      pointerEvents="box-none"
      testID={`guide.spotlight.${layer}`}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <SpotlightScrim hole={hole} />
        {hole ? <SpotlightRing hole={hole} radius={meta.ringRadius} /> : null}
      </View>
      <GuideStepCard
        testID={`guide.step.${step}`}
        stepNumber={guideStepIndex(step) + 1}
        stepCount={GUIDE_STEPS.length}
        title={stepCopy[step].title}
        body={stepCopy[step].body}
        progressTemplate={t.guide.step_progress}
        backLabel={t.guide.back_step}
        skipAllLabel={t.guide.skip_all}
        continueLabel={t.guide.continue_step}
        showBack={meta.canGoBack}
        onBack={guide.goBackStep}
        onSkipAll={guide.skipAll}
        onContinue={handleContinue}
        onLayout={setCardHeight}
        style={{
          position: 'absolute',
          left: CARD_MARGIN_H,
          right: CARD_MARGIN_H,
          top: cardTop,
          opacity: cardHeight > 0 ? 1 : 0,
        }}
      />
      {showConfirm ? (
        <View style={StyleSheet.absoluteFill}>
          <Pressable
            accessibilityLabel={t.guide.confirm_publish_back}
            onPress={guide.cancelPublishConfirm}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(36, 26, 22, 0.30)' }]}
          />
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, 16) + 8, backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
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
      ) : null}
    </View>
  );
}
