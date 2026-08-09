import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { tap } from '../../lib/haptics';
import { colors, radius, shadows, spacing, typography } from '../../theme/tokens';

interface BuddyCreateMenuProps {
  companionLabel: string;
  wishLabel: string;
  openLabel: string;
  closeLabel: string;
  onCompanionPress: () => void;
  onWishPress: () => void;
  bottom?: number;
  right?: number;
  initiallyOpen?: boolean;
  /** Lets the Buddy walkthrough measure and highlight the real + button. */
  toggleRef?: (node: View | null) => void;
}

interface MenuActionProps {
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone: 'coral' | 'lavender';
  testID: string;
}

function MenuAction({ accessibilityLabel, icon, label, onPress, tone, testID }: MenuActionProps) {
  const backgroundColor = tone === 'coral' ? colors.brandCoral : colors.lavender;
  return (
    <View style={styles.actionRow}>
      <View style={styles.labelBubble}>
        <Text numberOfLines={2} style={styles.labelText}>
          {label}
        </Text>
      </View>
      <Pressable
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => {
          tap('medium');
          onPress();
        }}
        style={styles.actionHitArea}
      >
        <View style={[styles.actionCircle, { backgroundColor }]}>
          <Ionicons name={icon} size={23} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
}

export function BuddyCreateMenu({
  companionLabel,
  wishLabel,
  openLabel,
  closeLabel,
  onCompanionPress,
  onWishPress,
  bottom = 0,
  right = 0,
  initiallyOpen = false,
  toggleRef,
}: BuddyCreateMenuProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const progress = useRef(new Animated.Value(initiallyOpen ? 1 : 0)).current;

  const open = () => {
    setIsOpen(true);
    progress.setValue(0);
    Animated.spring(progress, {
      toValue: 1,
      damping: 16,
      stiffness: 190,
      mass: 0.75,
      useNativeDriver: true,
    }).start();
  };

  const close = () => {
    setIsOpen(false);
    progress.setValue(0);
  };

  const select = (action: () => void) => {
    close();
    action();
  };

  return (
    <View style={[styles.root, { bottom, right }]}>
      {isOpen ? (
        <Animated.View
          style={[
            styles.actions,
            {
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <MenuAction
            accessibilityLabel={companionLabel}
            icon="people-outline"
            label={companionLabel}
            onPress={() => select(onCompanionPress)}
            tone="lavender"
            testID="buddy.create.companion"
          />
          <MenuAction
            accessibilityLabel={wishLabel}
            icon="sparkles-outline"
            label={wishLabel}
            onPress={() => select(onWishPress)}
            tone="coral"
            testID="buddy.create.wish"
          />
        </Animated.View>
      ) : null}

      <Pressable
        testID="buddy.create.toggle"
        accessibilityLabel={isOpen ? closeLabel : openLabel}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => {
          tap('medium');
          if (isOpen) close();
          else open();
        }}
        style={styles.toggleHitArea}
      >
        <View ref={toggleRef} collapsable={false} style={styles.toggleCircle}>
          <Ionicons name={isOpen ? 'close' : 'add'} size={30} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    pointerEvents: 'box-none',
    alignItems: 'flex-end',
    zIndex: 20,
  },
  actions: {
    alignItems: 'flex-end',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  labelBubble: {
    maxWidth: 180,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.cardWhiteSolid,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineSoft,
    ...shadows.iconButton,
  },
  labelText: {
    ...typography.caption,
    color: colors.textBrown,
    fontWeight: '700',
    textAlign: 'right',
  },
  actionHitArea: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.78)',
    ...shadows.cta,
  },
  toggleHitArea: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandCoral,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.84)',
    ...shadows.cta,
  },
});

export default BuddyCreateMenu;
