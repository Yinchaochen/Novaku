import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../theme/tokens';

// D-033 XHS-style fullscreen player: autoplay, loop, tap to pause, draggable
// seek bar (15-minute videos must be scrubable), mute toggle, swipe-down to
// close. Deliberately NOT the native fullscreen controls — the XHS look is a
// custom overlay on a cover-fit video.
const SWIPE_CLOSE_THRESHOLD = 120;

function formatTime(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// XHS-style right-hand action rail: like / comments / save / share, wired to
// the host surface's existing mutations so the player stays presentation-only.
export interface VideoPlayerActions {
  helpfulCount: number;
  viewerMarkedHelpful: boolean;
  onToggleHelpful: () => void;
  commentCount: number;
  onOpenComments: () => void;
  viewerSaved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
}

export function VideoFullscreenModal({
  visible,
  sourceUrl,
  onClose,
  actions,
}: {
  visible: boolean;
  sourceUrl: string | null;
  onClose: () => void;
  actions?: VideoPlayerActions;
}) {
  if (!visible || !sourceUrl) {
    return null;
  }
  return <FullscreenPlayer sourceUrl={sourceUrl} onClose={onClose} actions={actions} />;
}

function RailButton({
  icon,
  activeIcon,
  active,
  activeColor,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  activeColor?: string;
  label?: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      testID={testID}
      style={{ alignItems: 'center', gap: 3 }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.35)',
        }}
      >
        <Ionicons
          name={active && activeIcon ? activeIcon : icon}
          size={22}
          color={active ? (activeColor ?? colors.brandCoral) : '#FFFFFF'}
        />
      </View>
      {label ? (
        <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: '700' }}>{label}</Text>
      ) : null}
    </Pressable>
  );
}

function FullscreenPlayer({
  sourceUrl,
  onClose,
  actions,
}: {
  sourceUrl: string;
  onClose: () => void;
  actions?: VideoPlayerActions;
}) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const player = useVideoPlayer(sourceUrl, (instance) => {
    instance.loop = true;
    instance.timeUpdateEventInterval = 0.25;
    instance.play();
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { currentTime } = useEvent(player, 'timeUpdate', {
    currentTime: player.currentTime,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted });

  const [trackWidth, setTrackWidth] = useState(0);
  const [scrubFraction, setScrubFraction] = useState<number | null>(null);

  const translateY = useSharedValue(0);

  const duration = player.duration || 0;
  const playedFraction =
    scrubFraction ?? (duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0);

  const seekToFraction = (fraction: number) => {
    if (duration > 0) {
      player.currentTime = fraction * duration;
    }
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetY([20, 9999])
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > SWIPE_CLOSE_THRESHOLD) {
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(0, { duration: 160 });
      }
    });

  const clampFraction = (x: number) =>
    trackWidth > 0 ? Math.min(1, Math.max(0, x / trackWidth)) : 0;

  const scrubGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onBegin((event) => {
      runOnJS(setScrubFraction)(clampFraction(event.x));
    })
    .onUpdate((event) => {
      runOnJS(setScrubFraction)(clampFraction(event.x));
    })
    .onEnd((event) => {
      const fraction = clampFraction(event.x);
      runOnJS(seekToFraction)(fraction);
      runOnJS(setScrubFraction)(null);
    });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: 1 - translateY.value / (windowHeight * 1.2),
  }));

  const isLoading = status !== 'readyToPlay' && currentTime === 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }]} />
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[{ flex: 1 }, containerStyle]} testID="video.fullscreen">
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              nativeControls={false}
            />
            {/* Tap anywhere toggles play/pause (XHS behaviour). */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? t.video.pause : t.video.play}
              onPress={() => (isPlaying ? player.pause() : player.play())}
              style={StyleSheet.absoluteFill}
              testID="video.fullscreen.toggle"
            />
            {isLoading ? (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            ) : null}
            {!isPlaying && !isLoading ? (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                <View
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 38,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.35)',
                  }}
                >
                  <Ionicons name="play" size={40} color="rgba(255,255,255,0.95)" />
                </View>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.common.cancel}
              onPress={onClose}
              hitSlop={10}
              testID="video.fullscreen.close"
              style={{
                position: 'absolute',
                top: insets.top + 10,
                left: 16,
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.35)',
              }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>

            {actions ? (
              <View
                style={{
                  position: 'absolute',
                  right: 12,
                  bottom: Math.max(insets.bottom, 12) + 96,
                  gap: 16,
                  alignItems: 'center',
                }}
              >
                <RailButton
                  icon="heart-outline"
                  activeIcon="heart"
                  active={actions.viewerMarkedHelpful}
                  label={String(actions.helpfulCount)}
                  onPress={actions.onToggleHelpful}
                  testID="video.rail.helpful"
                />
                <RailButton
                  icon="chatbubble-ellipses-outline"
                  label={String(actions.commentCount)}
                  onPress={actions.onOpenComments}
                  testID="video.rail.comments"
                />
                <RailButton
                  icon="star-outline"
                  activeIcon="star"
                  active={actions.viewerSaved}
                  activeColor="#F59E0B"
                  onPress={actions.onToggleSave}
                  testID="video.rail.save"
                />
                <RailButton
                  icon="share-social-outline"
                  onPress={actions.onShare}
                  testID="video.rail.share"
                />
              </View>
            ) : null}

            <View
              style={{
                position: 'absolute',
                left: 16,
                right: actions ? 72 : 16,
                bottom: Math.max(insets.bottom, 12) + 14,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 12, fontVariant: ['tabular-nums'] }}>
                  {formatTime(scrubFraction != null ? scrubFraction * duration : currentTime)} / {formatTime(duration)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={muted ? t.video.unmute : t.video.mute}
                  onPress={() => {
                    player.muted = !muted;
                  }}
                  hitSlop={10}
                  testID="video.fullscreen.mute"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.35)',
                  }}
                >
                  <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={18} color="#FFFFFF" />
                </Pressable>
              </View>

              {/* Draggable seek bar — required for 15-minute videos. */}
              <GestureDetector gesture={scrubGesture}>
                <View
                  onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
                  hitSlop={{ top: 14, bottom: 14 }}
                  testID="video.fullscreen.seek"
                  style={{ height: 18, justifyContent: 'center' }}
                >
                  <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.32)' }} />
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: 0,
                      width: `${playedFraction * 100}%`,
                      height: 3,
                      borderRadius: 2,
                      backgroundColor: colors.brandCoral,
                    }}
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: `${playedFraction * 100}%`,
                      marginLeft: -7,
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </View>
              </GestureDetector>
            </View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}
