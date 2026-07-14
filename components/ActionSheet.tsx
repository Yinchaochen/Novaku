import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { type ComponentProps, useRef } from 'react';
import { Modal, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import { colors, fontFamily, radius, shadows, spacing } from '../theme/tokens';
import { FeedbackPressable } from './FeedbackPressable';

export interface ActionSheetAction {
  label: string;
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  destructive?: boolean;
}

interface Props {
  visible: boolean;
  title?: string;
  actions: ActionSheetAction[];
  onClose: () => void;
}

// Bottom action sheet replacing native Alert.alert for option menus. Native
// Android Alert caps at 3 buttons (a 4th is silently dropped) and its dismiss
// behaviour is inconsistent across OEM ROMs; this sheet always supports back
// (onRequestClose), backdrop tap, and an explicit Cancel.
export function ActionSheet({ visible, title, actions, onClose }: Props) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const sheetWidth = Math.min(width - spacing.lg * 2, 520);
  const pendingAction = useRef<(() => void) | null>(null);

  const runAction = (action: ActionSheetAction) => {
    // iOS can't present a new Modal while this one is still dismissing
    // (present-while-dismissing race). Defer the action until the sheet has
    // fully dismissed (onDismiss). Android never fires onDismiss, so run inline.
    if (Platform.OS === 'ios') {
      pendingAction.current = action.onPress;
      onClose();
      return;
    }
    onClose();
    action.onPress();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={() => {
        const next = pendingAction.current;
        pendingAction.current = null;
        next?.();
      }}
      statusBarTranslucent
    >
      <Pressable
        onPress={onClose}
        accessible={false}
        accessibilityViewIsModal
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(36, 26, 22, 0.52)',
          paddingBottom: Math.max(insets.bottom, spacing.md),
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: sheetWidth,
            overflow: 'hidden',
            borderRadius: radius['2xl'],
            borderWidth: 1,
            borderColor: colors.lineWarm,
            backgroundColor: colors.bgCream,
            ...shadows.cardLg,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 42,
              height: 5,
              marginTop: spacing.sm,
              borderRadius: radius.pill,
              backgroundColor: colors.bgWarmDeep,
            }}
          />

          {title ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing.lg,
                paddingBottom: spacing.md,
                paddingTop: spacing.md,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 15,
                  backgroundColor: colors.brandCoral,
                }}
              >
                <Image
                  source={require('../assets/adaptive-icon.png')}
                  contentFit="contain"
                  accessible={false}
                  style={{ width: 32, height: 32 }}
                />
              </View>
              <Text
                style={{
                  marginLeft: spacing.md,
                  flex: 1,
                  fontFamily: fontFamily.displayBold,
                  fontSize: 18,
                  fontWeight: '700',
                  color: colors.textMain,
                }}
              >
                {title}
              </Text>
            </View>
          ) : null}

          <View
            style={{
              marginHorizontal: spacing.md,
              overflow: 'hidden',
              borderRadius: radius.xl,
              backgroundColor: colors.cardWhiteSolid,
            }}
          >
            {actions.map((action, index) => {
              const actionColor = action.destructive ? colors.danger : colors.textBrown;
              const actionBackground = action.destructive
                ? colors.dangerSoft
                : colors.bgWarm;

              return (
                <FeedbackPressable
                  key={`${action.icon ?? 'action'}-${action.label}`}
                  onPress={() => runAction(action)}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  android_ripple={{ color: colors.lineSofter }}
                  style={{
                    minHeight: 62,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.lineSofter,
                    backgroundColor: colors.cardWhiteSolid,
                  }}
                  pressedStyle={{ backgroundColor: colors.bgCream }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 14,
                      backgroundColor: actionBackground,
                    }}
                  >
                    <Ionicons
                      name={
                        action.icon ??
                        (action.destructive
                          ? 'alert-circle-outline'
                          : 'arrow-forward-circle-outline')
                      }
                      size={21}
                      color={actionColor}
                    />
                  </View>
                  <Text
                    style={{
                      marginLeft: spacing.md,
                      flex: 1,
                      fontFamily: fontFamily.semibold,
                      fontSize: 15.5,
                      fontWeight: '600',
                      color: actionColor,
                    }}
                  >
                    {action.label}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={action.destructive ? colors.danger : colors.textSubtle}
                  />
                </FeedbackPressable>
              );
            })}
          </View>

          <FeedbackPressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t.common.cancel}
            android_ripple={{ color: colors.lineSofter }}
            style={{
              minHeight: 54,
              marginHorizontal: spacing.md,
              marginBottom: spacing.md,
              marginTop: spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.xl,
              backgroundColor: colors.bgWarm,
            }}
            pressedStyle={{ backgroundColor: colors.bgWarmDeep }}
          >
            <Ionicons name="close" size={19} color={colors.textMuted} />
            <Text
              style={{
                marginLeft: spacing.sm,
                fontFamily: fontFamily.displayBold,
                fontSize: 15,
                fontWeight: '700',
                color: colors.textBrown,
                textAlign: 'center',
              }}
            >
              {t.common.cancel}
            </Text>
          </FeedbackPressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
