import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/tokens';

export interface FloatingInputSheetProps {
  visible: boolean;
  initialValue: string;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  onConfirm: (value: string) => void;
  onClose: () => void;
  testID?: string;
}

// D-052 keyboard-safe editing: typing happens in this transparent Modal
// pinned above the keyboard (the same shell CommentComposerSheet ships with),
// so no host screen or host-Modal keyboard quirk can ever cover the text.
// Confirm commits the draft back to the source field; backdrop/cancel discard.
export function FloatingInputSheet({
  visible,
  initialValue,
  placeholder,
  multiline,
  maxLength,
  keyboardType,
  autoCapitalize,
  onConfirm,
  onClose,
  testID = 'floating-input',
}: FloatingInputSheetProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [draft, setDraft] = useState(initialValue);

  useEffect(() => {
    if (!visible) return;
    setDraft(initialValue);
    // Focus after the slide-in settles — focusing earlier drops the keyboard
    // on Android (timing proven by CommentComposerSheet).
    const timer = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const confirm = () => {
    onConfirm(draft);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        // Android must stay undefined (GOTCHAS "写代码时碰到的细节差异" table).
        // behavior="height" makes this view set its own height from its
        // measured frame, inside a transparent Modal, under edge-to-edge —
        // where the frame it measures and the metrics it measures against
        // come from different windows and never agree. Each pass writes a
        // height that provokes the next one, so with justifyContent
        // flex-end the sheet oscillates between two positions ~50px apart,
        // every frame, with nobody touching the screen. Android resizes the
        // window for the keyboard on its own; this view has nothing to add.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          accessibilityLabel={t.common.cancel}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}
          onPress={onClose}
          testID={`${testID}.backdrop`}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              backgroundColor: '#FFFFFF',
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: Math.max(insets.bottom + 12, 16),
            }}
          >
            <View
              style={{
                borderRadius: 16,
                backgroundColor: '#F5F5F7',
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <TextInput
                ref={inputRef}
                testID={`${testID}.input`}
                value={draft}
                onChangeText={setDraft}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                multiline={multiline}
                maxLength={maxLength}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                style={[
                  { fontSize: 16, color: colors.textMain },
                  multiline
                    ? { minHeight: 72, maxHeight: 180, textAlignVertical: 'top' }
                    : { height: 40 },
                ]}
              />
            </View>
            {typeof maxLength === 'number' ? (
              <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: colors.textSubtle }}>
                  {draft.length}/{maxLength}
                </Text>
              </View>
            ) : null}
            <View
              style={{
                marginTop: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.common.cancel}
                onPress={onClose}
                hitSlop={8}
                testID={`${testID}.cancel`}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 14, color: colors.textMuted }}>{t.common.cancel}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.common.confirm}
                onPress={confirm}
                hitSlop={8}
                testID={`${testID}.confirm`}
                style={{
                  minHeight: 44,
                  justifyContent: 'center',
                  borderRadius: 999,
                  paddingHorizontal: 22,
                  backgroundColor: colors.brandCoral,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
                  {t.common.confirm}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
