import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { FeedbackPressable } from '../FeedbackPressable';
import { GuideTargetRect } from '../../features/guide/guideTargets';
import { colors, shadows, typography } from '../../theme/tokens';

// Presentational pieces of the walkthrough spotlight, shared by every container
// (SpotlightOverlay) and by the dev galleries. Variant A of the reviewed
// prototype (outputs/onboarding-highlight-prototype) with variant B's anchored
// explanation card: strong scrim, coral ring around the real control, step card
// next to it. The scrim is pointerEvents:none by design — the walkthrough
// points, it never locks the UI.
const SCRIM_COLOR = 'rgba(36, 26, 22, 0.60)';

export interface GuideHole extends GuideTargetRect {}

// One scrim with a rounded hole, and the coral ring with its white halo around
// it. Hole and ring share a single breathing value, so the hole grows and
// shrinks with the ring instead of sitting still as a sharp-cornered rectangle
// behind it. The scrim is a transparent view whose border is the scrim colour:
// the border reaches past every screen edge and its inner edge is the hole. A
// masked view would need a native library this app does not ship.
export function Spotlight({ hole, radius }: { hole: GuideHole | null; radius: number | 'pill' }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

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

  if (!hole) {
    return <View testID="spotlight.scrim" style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM_COLOR }]} />;
  }

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const holeRadius = radius === 'pill' ? hole.height / 2 : radius;
  // Wide enough to cover the screen from wherever the hole sits; the pulse only
  // ever scales up from 1. `overflow: hidden` keeps iOS on CoreAnimation borders
  // (layer.borderWidth + cornerRadius) rather than rasterising a border image
  // the size of this reach.
  const reach = Math.max(windowWidth, windowHeight);

  return (
    <>
      <Animated.View
        testID="spotlight.scrim"
        style={{
          position: 'absolute',
          left: hole.x - reach,
          top: hole.y - reach,
          width: hole.width + reach * 2,
          height: hole.height + reach * 2,
          borderWidth: reach,
          borderColor: SCRIM_COLOR,
          borderRadius: holeRadius + reach,
          overflow: 'hidden',
          transform: [{ scale }],
        }}
      />
      <Animated.View
        testID="spotlight.ring"
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
            borderRadius: holeRadius + 8,
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
            borderRadius: holeRadius + 3,
          }}
        />
      </Animated.View>
    </>
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
            minHeight: 44,
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
