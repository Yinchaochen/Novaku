import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconCircleButton } from '../../components/IconCircleButton';
import { Pill } from '../../components/Pill';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/tokens';

interface Props {
  visible: boolean;
  mediaUrls: readonly string[];
  activeIndex: number;
  closeLabel: string;
  previousLabel: string;
  nextLabel: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

function wrapIndex(index: number, itemCount: number) {
  if (itemCount <= 0) return 0;
  return ((index % itemCount) + itemCount) % itemCount;
}

export function CommunityPostImageViewer({
  visible,
  mediaUrls,
  activeIndex,
  closeLabel,
  previousLabel,
  nextLabel,
  onClose,
  onIndexChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const itemCount = mediaUrls.length;
  const currentIndex = wrapIndex(activeIndex, itemCount);
  const currentUrl = mediaUrls[currentIndex];
  const hasPager = itemCount > 1;

  const moveBy = (delta: number) => {
    onIndexChange(wrapIndex(currentIndex + delta, itemCount));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop} accessibilityViewIsModal>
        <Screen background="none" contentStyle={styles.screen} testID="plaza.imageViewer">
          <Pressable
            accessible={false}
            onPress={onClose}
            style={StyleSheet.absoluteFill}
            testID="plaza.imageViewer.dismiss"
          >
            {currentUrl ? (
              <Image
                source={currentUrl}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                transition={120}
                testID="plaza.imageViewer.image"
              />
            ) : null}
          </Pressable>

          {hasPager ? (
            <>
              <Pill
                label={`${currentIndex + 1}/${itemCount}`}
                tone="cream"
                size="md"
                style={{ ...styles.counter, top: insets.top + 14 }}
                textStyle={styles.counterText}
              />

              <IconCircleButton
                accessibilityLabel={previousLabel}
                onPress={() => moveBy(-1)}
                size={48}
                tone="glass"
                style={styles.previousButton}
              >
                <Ionicons name="chevron-back" size={28} color={colors.textMain} />
              </IconCircleButton>

              <IconCircleButton
                accessibilityLabel={nextLabel}
                onPress={() => moveBy(1)}
                size={48}
                tone="glass"
                style={styles.nextButton}
              >
                <Ionicons name="chevron-forward" size={28} color={colors.textMain} />
              </IconCircleButton>
            </>
          ) : null}

          <IconCircleButton
            accessibilityLabel={closeLabel}
            onPress={onClose}
            size={44}
            tone="glass"
            style={{ ...styles.closeButton, top: insets.top + 10 }}
          >
            <Ionicons name="close" size={26} color={colors.textMain} />
          </IconCircleButton>
        </Screen>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.97)',
  },
  screen: {
    position: 'relative',
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 248, 241, 0.94)',
    borderColor: 'rgba(255, 255, 255, 0.86)',
  },
  counterText: {
    color: colors.textMain,
    letterSpacing: 0,
    textTransform: 'none',
  },
  previousButton: {
    position: 'absolute',
    left: 18,
    top: '50%',
    transform: [{ translateY: -24 }],
  },
  nextButton: {
    position: 'absolute',
    right: 18,
    top: '50%',
    transform: [{ translateY: -24 }],
  },
  closeButton: {
    position: 'absolute',
    right: 18,
  },
});
