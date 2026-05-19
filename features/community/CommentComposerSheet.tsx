import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../../context/LanguageContext';

export interface CommentComposerInput {
  body: string;
  parent_comment_id?: string | null;
  reply_to_user_id?: string | null;
  reply_to_user_name?: string | null;
}

export interface CommentComposerSheetProps {
  visible: boolean;
  pending: boolean;
  /** Current reply target (null for plain comment mode). */
  replyTo: { commentId: string; userId: string; userName: string } | null;
  /** When set, the sheet renders in edit mode and prefills the body. */
  editTarget?: { commentId: string; initialBody: string } | null;
  onClose: () => void;
  onCancelReply: () => void;
  onSubmit: (input: CommentComposerInput) => void;
  onSubmitEdit?: (input: { commentId: string; body: string }) => void;
}

export function CommentComposerSheet({
  visible,
  pending,
  replyTo,
  editTarget,
  onClose,
  onCancelReply,
  onSubmit,
  onSubmitEdit,
}: CommentComposerSheetProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (visible) {
      // Prefill edit body on open; otherwise start blank.
      setText(editTarget?.initialBody ?? '');
      const timer = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
    setText('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, editTarget?.commentId]);

  const placeholder = editTarget
    ? t.comments.edit_placeholder
    : replyTo
    ? t.comments.reply_to_placeholder.replace('{name}', replyTo.userName)
    : t.comments.say_something;

  const trimmed = text.trim();
  const canSend = trimmed.length >= 2 && !pending;

  const handleSend = () => {
    if (!canSend) return;
    if (editTarget && onSubmitEdit) {
      onSubmitEdit({ commentId: editTarget.commentId, body: trimmed });
      return;
    }
    onSubmit({
      body: trimmed,
      parent_comment_id: replyTo?.commentId ?? null,
      reply_to_user_id: replyTo?.userId ?? null,
      reply_to_user_name: replyTo?.userName ?? null,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onPress={onClose}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-t-3xl bg-white px-4 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom + 12, 16) }}
          >
            {editTarget ? (
              <View className="mb-2 flex-row items-center self-start rounded-full bg-[#F5F5F7] px-3 py-1.5">
                <Ionicons name="create-outline" size={12} color="#6B7280" />
                <Text className="ml-1 text-[12px] text-neutral-600">
                  {t.comments.editing_comment}
                </Text>
              </View>
            ) : replyTo ? (
              <View className="mb-2 flex-row items-center self-start rounded-full bg-[#FFF1F3] px-3 py-1.5">
                <Text className="text-[12px] text-[#F47C7C]">
                  {t.comments.replying_to.replace('{name}', replyTo.userName)}
                </Text>
                <Pressable onPress={onCancelReply} hitSlop={6} className="ml-2">
                  <Ionicons name="close" size={14} color="#F47C7C" />
                </Pressable>
              </View>
            ) : null}

            <View className="rounded-2xl bg-[#F5F5F7] px-3 py-2">
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                multiline
                className="min-h-[60px] text-[15px] text-black"
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <Pressable onPress={onClose} hitSlop={6}>
                <Text className="text-[14px] text-neutral-500">{t.common.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={handleSend}
                disabled={!canSend}
                className="rounded-full px-5 py-2"
                style={{ backgroundColor: canSend ? '#F47C7C' : '#FCA5A5' }}
              >
                {pending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-[14px] font-semibold text-white">
                    {editTarget ? t.comments.save_edit : t.comments.send}
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
