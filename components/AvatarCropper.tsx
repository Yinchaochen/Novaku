/**
 * Avatar cropper with a circular mask, pan + pinch zoom, and explicit
 * Confirm / Cancel actions.
 *
 * Replaces the OS image-picker's built-in cropper which: (a) has no visible
 * Done button on some Android skins, (b) only offers a square frame even
 * though the avatar is rendered as a circle everywhere, (c) doesn't let
 * users pinch-zoom to control the crop region.
 *
 * Uses React Native's classic `Animated` + `PanResponder` rather than
 * react-native-reanimated. Reanimated v4 + react-native-worklets ships a
 * TurboModule that mis-binds in Expo Go (SDK 54), throwing
 * "installTurboModule called with 1 arguments (expected argument count: 0)"
 * the moment any worklet-using module loads. PanResponder handles the
 * multi-touch math itself by inspecting `evt.nativeEvent.touches`, which is
 * the same approach old `react-native-image-zoom-viewer` /
 * `react-native-image-pan-zoom` libraries used pre-Reanimated.
 *
 * Multi-touch state is driven from explicit Grant / Start / Move / End
 * callbacks rather than inferred from one Move stream — Android's older
 * gesture pipeline doesn't always emit phantom Moves when a second finger
 * lands, so we re-baseline on every touch-count transition.
 */

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image as RNImage,
  PanResponder,
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';

import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/tokens';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CROP_SIZE = Math.min(SCREEN_WIDTH - 64, 320);

const MIN_SCALE = 1.0; // can't zoom out past cover-fit or empty pixels show
const MAX_SCALE = 4.0; // generous enough to crop a face out of a group shot

export interface AvatarCropperProps {
  uri: string;
  imageWidth: number;
  imageHeight: number;
  /**
   * Called once the user taps Confirm and the local crop is applied. May
   * return a Promise — the cropper keeps its Confirm spinner visible until
   * it resolves so the parent can run the avatar upload without the modal
   * flickering closed mid-flight.
   */
  onConfirm: (croppedUri: string) => Promise<void> | void;
  onCancel: () => void;
}

interface Touch {
  x: number;
  y: number;
}

function touchDistance(a: Touch, b: Touch): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function readTouches(evt: GestureResponderEvent): Touch[] {
  return evt.nativeEvent.touches.map((t) => ({ x: t.pageX, y: t.pageY }));
}

export function AvatarCropper({
  uri,
  imageWidth,
  imageHeight,
  onConfirm,
  onCancel,
}: AvatarCropperProps) {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);

  // baseScale fits the image's SHORTER edge to CROP_SIZE so the image always
  // covers the circle at userScale = 1. User pinch-zoom multiplies on top.
  const baseScale = CROP_SIZE / Math.min(imageWidth, imageHeight);
  const displayedWidth = imageWidth * baseScale;
  const displayedHeight = imageHeight * baseScale;

  // ── Transform state ─────────────────────────────────────────────────────
  // Animated values drive the rendered View transform. Mirror refs hold the
  // same numbers so we can read them synchronously inside gesture callbacks
  // (Animated.Value's internal `_value` is private and untyped).
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const currentX = useRef(0);
  const currentY = useRef(0);
  const currentScale = useRef(1);

  // ── Per-gesture baselines ───────────────────────────────────────────────
  // Re-snapshotted whenever the touch count changes mid-gesture (1 finger
  // down -> 2 fingers, or 2 -> 1). Without this, switching modes makes the
  // image jump by the cumulative pre-transition delta.
  const lastTouchCount = useRef(0);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const clampTranslate = (x: number, y: number, scale: number) => {
    const scaledW = displayedWidth * scale;
    const scaledH = displayedHeight * scale;
    const maxX = Math.max(0, (scaledW - CROP_SIZE) / 2);
    const maxY = Math.max(0, (scaledH - CROP_SIZE) / 2);
    return {
      x: clamp(x, -maxX, maxX),
      y: clamp(y, -maxY, maxY),
    };
  };

  const setTransform = (x: number, y: number, scale: number) => {
    currentX.current = x;
    currentY.current = y;
    currentScale.current = scale;
    translateX.setValue(x);
    translateY.setValue(y);
    scaleAnim.setValue(scale);
  };

  const beginPanFrom = (touch: Touch) => {
    panStart.current = {
      x: touch.x,
      y: touch.y,
      tx: currentX.current,
      ty: currentY.current,
    };
  };

  const beginPinchFrom = (touches: Touch[]) => {
    pinchStart.current = {
      dist: touchDistance(touches[0], touches[1]),
      scale: currentScale.current,
    };
  };

  // ── PanResponder ────────────────────────────────────────────────────────

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      // Don't let outer scroll views / modal handlers steal the gesture.
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt) => {
        const touches = readTouches(evt);
        lastTouchCount.current = touches.length;
        if (touches.length === 2) {
          beginPinchFrom(touches);
        } else if (touches.length === 1) {
          beginPanFrom(touches[0]);
        }
      },

      onPanResponderStart: (evt) => {
        // A new finger landed on top of the already-active gesture (most
        // commonly: pan was in progress, user adds 2nd finger to pinch).
        // Re-baseline so the next Move frame sees a fresh pinch reference.
        const touches = readTouches(evt);
        if (touches.length !== lastTouchCount.current) {
          lastTouchCount.current = touches.length;
          if (touches.length >= 2) {
            beginPinchFrom(touches);
            // Settle whatever pan accumulated so subsequent post-pinch pan
            // continues from the visible position, not the gesture origin.
            panStart.current = null;
          } else if (touches.length === 1) {
            beginPanFrom(touches[0]);
            pinchStart.current = null;
          }
        }
      },

      onPanResponderMove: (evt) => {
        const touches = readTouches(evt);

        // Touch count may also flip silently inside Move on some devices
        // (e.g., Huawei EMUI). Re-baseline defensively.
        if (touches.length !== lastTouchCount.current) {
          lastTouchCount.current = touches.length;
          if (touches.length >= 2) {
            beginPinchFrom(touches);
            panStart.current = null;
            return;
          }
          if (touches.length === 1) {
            beginPanFrom(touches[0]);
            pinchStart.current = null;
            return;
          }
        }

        if (touches.length >= 2 && pinchStart.current) {
          const dist = touchDistance(touches[0], touches[1]);
          if (pinchStart.current.dist <= 0) return;
          const ratio = dist / pinchStart.current.dist;
          const nextScale = clamp(
            pinchStart.current.scale * ratio,
            MIN_SCALE,
            MAX_SCALE,
          );
          // Re-clamp translate to the new scale's bounds.
          const clamped = clampTranslate(
            currentX.current,
            currentY.current,
            nextScale,
          );
          setTransform(clamped.x, clamped.y, nextScale);
          return;
        }

        if (touches.length === 1 && panStart.current) {
          const dx = touches[0].x - panStart.current.x;
          const dy = touches[0].y - panStart.current.y;
          const clamped = clampTranslate(
            panStart.current.tx + dx,
            panStart.current.ty + dy,
            currentScale.current,
          );
          setTransform(clamped.x, clamped.y, currentScale.current);
        }
      },

      onPanResponderEnd: (evt) => {
        // A finger went up. If we drop from 2 to 1, the remaining finger may
        // still keep panning — re-baseline pan from its current position.
        const touches = readTouches(evt);
        if (touches.length === 1) {
          beginPanFrom(touches[0]);
          pinchStart.current = null;
          lastTouchCount.current = 1;
        }
      },

      onPanResponderRelease: () => {
        lastTouchCount.current = 0;
        panStart.current = null;
        pinchStart.current = null;
      },

      onPanResponderTerminate: () => {
        lastTouchCount.current = 0;
        panStart.current = null;
        pinchStart.current = null;
      },
    }),
  ).current;

  // ── Confirm: cut the JPEG using current transform ───────────────────────

  const handleConfirm = async () => {
    setIsProcessing(true);

    let croppedUri = uri;
    try {
      // Convert screen-space transform back into original-image pixel coords.
      // totalScale = baseScale * userScale; crop area is centered on the
      // screen at (CROP_SIZE/2, CROP_SIZE/2); the image's center is offset
      // by (currentX, currentY). So the crop center in image coords is:
      //   (W/2, H/2) − (currentX, currentY) / totalScale
      const totalScale = baseScale * currentScale.current;
      const cropCenterX = imageWidth / 2 - currentX.current / totalScale;
      const cropCenterY = imageHeight / 2 - currentY.current / totalScale;
      const cropSizePx = CROP_SIZE / totalScale;

      const rawOriginX = cropCenterX - cropSizePx / 2;
      const rawOriginY = cropCenterY - cropSizePx / 2;
      const safeOriginX = Math.max(
        0,
        Math.min(rawOriginX, imageWidth - cropSizePx),
      );
      const safeOriginY = Math.max(
        0,
        Math.min(rawOriginY, imageHeight - cropSizePx),
      );
      const safeSize = Math.min(cropSizePx, imageWidth, imageHeight);

      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            crop: {
              originX: safeOriginX,
              originY: safeOriginY,
              width: safeSize,
              height: safeSize,
            },
          },
        ],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
      );
      croppedUri = result.uri;
    } catch (_err) {
      // Local crop failed — fall through to upload raw so user isn't blocked.
    }

    try {
      await onConfirm(croppedUri);
    } catch (_err) {
      setIsProcessing(false);
    }
  };

  // Keep cropper state in sync if the source image changes (rare, but the
  // pencil button re-opens with a different uri). Reset all transforms.
  useEffect(() => {
    currentX.current = 0;
    currentY.current = 0;
    currentScale.current = 1;
    translateX.setValue(0);
    translateY.setValue(0);
    scaleAnim.setValue(1);
  }, [uri, scaleAnim, translateX, translateY]);

  return (
    <View style={{ flex: 1, backgroundColor: '#05070D' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 56,
          paddingBottom: 16,
        }}
      >
        <Pressable
          onPress={onCancel}
          disabled={isProcessing}
          hitSlop={12}
          style={{ padding: 4 }}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#FFFFFF' }}>
          {t.profile.change_avatar}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Circular crop area. The PanResponder lives on the inner Animated.View
          that holds the image; overflow:hidden + borderRadius carves the
          circle. The image is free to pan + scale underneath. */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: CROP_SIZE,
            height: CROP_SIZE,
            borderRadius: CROP_SIZE / 2,
            overflow: 'hidden',
            backgroundColor: '#11151E',
          }}
        >
          <Animated.View
            {...responder.panHandlers}
            style={{
              width: displayedWidth,
              height: displayedHeight,
              position: 'absolute',
              left: (CROP_SIZE - displayedWidth) / 2,
              top: (CROP_SIZE - displayedHeight) / 2,
              transform: [
                { translateX },
                { translateY },
                { scale: scaleAnim },
              ],
            }}
          >
            <RNImage
              source={{ uri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </Animated.View>
        </View>

        {/* White ring overlay so the crop boundary stays visible even when
            the photo tone matches the background. pointerEvents:none so it
            doesn't intercept the pan/pinch on the image below. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: CROP_SIZE + 4,
            height: CROP_SIZE + 4,
            borderRadius: (CROP_SIZE + 4) / 2,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.85)',
          }}
        />
      </View>

      {/* Bottom actions */}
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          paddingHorizontal: 24,
          paddingBottom: 36,
          paddingTop: 12,
        }}
      >
        <Pressable
          onPress={onCancel}
          disabled={isProcessing}
          style={{
            flex: 1,
            height: 52,
            borderRadius: 26,
            backgroundColor: 'rgba(255,255,255,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isProcessing ? 0.5 : 1,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            {t.common.cancel}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleConfirm}
          disabled={isProcessing}
          style={{
            flex: 1,
            height: 52,
            borderRadius: 26,
            backgroundColor: '#FF8F7E',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isProcessing ? 0.6 : 1,
            shadowColor: colors.brandCoral,
            shadowOpacity: isProcessing ? 0 : 0.28,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: isProcessing ? 0 : 6,
          }}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '700',
                letterSpacing: 0.2,
              }}
            >
              {t.common.confirm}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
