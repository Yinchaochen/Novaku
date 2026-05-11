import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Text,
  View,
} from 'react-native';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as unknown as typeof FlatList;

/**
 * iOS-style scroll-snap wheel. Renders a vertical list where one row sits
 * under a horizontal highlight band; scrolling snaps to the nearest item.
 * Top/bottom edges fade to the surrounding white via LinearGradient so the
 * off-center items soften out.
 */
export interface ScrollWheelProps<T extends string | number> {
  items: readonly T[];
  value: T;
  onChange: (next: T) => void;
  /** Pixel height of each row. Defaults to 36. */
  itemHeight?: number;
  /** Number of rows visible (odd number recommended). Defaults to 5. */
  visibleCount?: number;
  /** Optional formatter for display text (e.g. zero-pad hours). */
  formatter?: (v: T) => string;
  /** Color used for the top/bottom fade. Defaults to white. */
  fadeColor?: string;
}

export function ScrollWheel<T extends string | number>({
  items,
  value,
  onChange,
  itemHeight = 36,
  visibleCount = 5,
  formatter,
  fadeColor = '#FFFFFF',
}: ScrollWheelProps<T>) {
  const listRef = useRef<FlatList<T>>(null);
  const isInteractingRef = useRef(false);
  const momentumActiveRef = useRef(false);
  const endDragSnapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelHeight = itemHeight * visibleCount;
  const paddingV = (wheelHeight - itemHeight) / 2;
  const fadeHeight = paddingV;

  const selectedIndex = Math.max(0, items.indexOf(value));
  const scrollY = useRef(new Animated.Value(selectedIndex * itemHeight)).current;
  // Track the last value we programmatically scrolled to so an externally
  // pushed `value` repositions the wheel; user-driven scrolls don't trip this
  // because we update `value` via onChange first, then re-render.
  const lastSyncedIndexRef = useRef<number | null>(null);

  const clearEndDragSnapTimer = useCallback(() => {
    if (endDragSnapTimeoutRef.current) {
      clearTimeout(endDragSnapTimeoutRef.current);
      endDragSnapTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearEndDragSnapTimer, [clearEndDragSnapTimer]);

  const syncTo = useCallback(
    (index: number, animated: boolean) => {
      const offset = index * itemHeight;
      listRef.current?.scrollToOffset({ offset, animated });
      lastSyncedIndexRef.current = index;
      if (!animated) {
        scrollY.setValue(offset);
      }
    },
    [itemHeight, scrollY],
  );

  // Position the wheel exactly once the content has laid out. `useEffect`
  // alone can race with Modal mount on Android and leave the wheel stuck.
  const onContentSizeChange = useCallback(() => {
    if (lastSyncedIndexRef.current !== selectedIndex) {
      syncTo(selectedIndex, false);
    }
  }, [selectedIndex, syncTo]);

  // If the parent pushes a new value after first layout, animate the wheel to
  // it. During a gesture, the user's current motion owns the wheel.
  useEffect(() => {
    if (
      !isInteractingRef.current &&
      lastSyncedIndexRef.current !== null &&
      lastSyncedIndexRef.current !== selectedIndex
    ) {
      syncTo(selectedIndex, true);
    }
  }, [selectedIndex, syncTo]);

  const commitFromOffset = useCallback(
    (offset: number, animated: boolean) => {
      const idx = Math.round(offset / itemHeight);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      const targetOffset = clamped * itemHeight;

      lastSyncedIndexRef.current = clamped;
      isInteractingRef.current = false;
      momentumActiveRef.current = false;

      if (Math.abs(offset - targetOffset) > 0.5) {
        syncTo(clamped, animated);
      }

      if (items[clamped] !== value) {
        onChange(items[clamped]);
      }
    },
    [itemHeight, items, onChange, syncTo, value],
  );

  const handleScrollBeginDrag = useCallback(() => {
    clearEndDragSnapTimer();
    isInteractingRef.current = true;
  }, [clearEndDragSnapTimer]);

  const handleMomentumScrollBegin = useCallback(() => {
    clearEndDragSnapTimer();
    momentumActiveRef.current = true;
  }, [clearEndDragSnapTimer]);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      clearEndDragSnapTimer();
      commitFromOffset(e.nativeEvent.contentOffset.y, true);
    },
    [clearEndDragSnapTimer, commitFromOffset],
  );

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = e.nativeEvent.contentOffset.y;
      const velocityY = Math.abs(e.nativeEvent.velocity?.y ?? 0);

      clearEndDragSnapTimer();
      if (velocityY > 0.05) {
        return;
      }

      // Android may skip momentum events on a slow drag. Wait one beat so a
      // real fling can claim the motion first, then correct only if it doesn't.
      endDragSnapTimeoutRef.current = setTimeout(() => {
        if (!momentumActiveRef.current) {
          commitFromOffset(offset, true);
        }
      }, 120);
    },
    [clearEndDragSnapTimer, commitFromOffset],
  );

  const handleTouchCancel = useCallback(() => {
    clearEndDragSnapTimer();
    isInteractingRef.current = false;
    momentumActiveRef.current = false;
  }, [clearEndDragSnapTimer]);

  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: T; index: number }) => {
      const centerOffset = index * itemHeight;
      const inputRange = [
        centerOffset - itemHeight * 2,
        centerOffset - itemHeight,
        centerOffset,
        centerOffset + itemHeight,
        centerOffset + itemHeight * 2,
      ];

      const opacity = scrollY.interpolate({
        inputRange,
        outputRange: [0.18, 0.52, 1, 0.52, 0.18],
        extrapolate: 'clamp',
      });
      const scale = scrollY.interpolate({
        inputRange,
        outputRange: [0.84, 0.92, 1, 0.92, 0.84],
        extrapolate: 'clamp',
      });
      const rotateX = scrollY.interpolate({
        inputRange,
        outputRange: ['38deg', '20deg', '0deg', '-20deg', '-38deg'],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View
          style={{
            height: itemHeight,
            alignItems: 'center',
            justifyContent: 'center',
            opacity,
            transform: [{ perspective: 700 }, { rotateX }, { scale }],
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: '#111111',
            }}
          >
            {formatter ? formatter(item) : String(item)}
          </Text>
        </Animated.View>
      );
    },
    [formatter, itemHeight, scrollY],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<T> | null | undefined, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
    [itemHeight],
  );

  const snapOffsets = useMemo(
    () => items.map((_, index) => index * itemHeight),
    [itemHeight, items],
  );

  const keyExtractor = useCallback((item: T, index: number) => `${String(item)}-${index}`, []);

  const transparent = `${fadeColor}00`;

  return (
    <View style={{ height: wheelHeight, overflow: 'hidden', position: 'relative' }}>
      {/* center highlight band */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: paddingV,
          left: 6,
          right: 6,
          height: itemHeight,
          borderRadius: itemHeight / 2,
          backgroundColor: 'rgba(244,124,124,0.10)',
        }}
      />
      <AnimatedFlatList
        ref={listRef}
        data={items as T[]}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialScrollIndex={selectedIndex}
        style={{ height: wheelHeight }}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        snapToOffsets={snapOffsets}
        decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.92}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollBegin={handleMomentumScrollBegin}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
        onTouchCancel={handleTouchCancel}
        onContentSizeChange={onContentSizeChange}
        contentContainerStyle={{ paddingTop: paddingV, paddingBottom: paddingV }}
        snapToAlignment={Platform.OS === 'ios' ? 'start' : undefined}
        // Android: nested vertical scroll requires this to compete with any
        // ancestor ScrollView. iOS scroll claim is automatic.
        nestedScrollEnabled
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        removeClippedSubviews={false}
        // Keep gestures responsive when wrapped under tap targets.
        keyboardShouldPersistTaps="handled"
      />

      {/* Top fade - solid surface color to transparent */}
      <LinearGradient
        pointerEvents="none"
        colors={[fadeColor, transparent]}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: fadeHeight,
        }}
      />
      {/* Bottom fade - transparent to solid surface color */}
      <LinearGradient
        pointerEvents="none"
        colors={[transparent, fadeColor]}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: fadeHeight,
        }}
      />
    </View>
  );
}
