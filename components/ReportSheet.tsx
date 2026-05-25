import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import {
  ReportContentType,
  ReportReason,
  useSubmitReport,
} from '../features/compliance/useCompliance';

const REASONS: ReportReason[] = [
  'illegal_content',
  'hate_speech',
  'harassment',
  'sexual_content_minor',
  'violence',
  'terrorism',
  'csam',
  'self_harm',
  'spam',
  'copyright',
  'impersonation',
  'misinformation',
  'tos_violation',
  'other',
];

export interface ReportSheetProps {
  visible: boolean;
  contentType: ReportContentType;
  contentId: string | null;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function ReportSheet({
  visible,
  contentType,
  contentId,
  onClose,
  onSubmitted,
}: ReportSheetProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const submit = useSubmitReport();

  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [goodFaith, setGoodFaith] = useState(false);

  const reset = () => {
    setReason(null);
    setDescription('');
    setGoodFaith(false);
    submit.reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!contentId || !reason) return;
    if (description.trim().length < 20) {
      Alert.alert(t.report.description_too_short);
      return;
    }
    if (!goodFaith) {
      Alert.alert(t.report.good_faith_required);
      return;
    }
    submit.mutate(
      {
        content_type: contentType,
        content_id: contentId,
        reason_category: reason,
        reason_description: description.trim(),
        good_faith_declaration: true,
      },
      {
        onSuccess: () => {
          Alert.alert(t.report.submitted_toast);
          reset();
          onSubmitted?.();
          onClose();
        },
        onError: () => {
          Alert.alert(t.common.error);
        },
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      {/* IOS-LOGIN-111: iOS Modal context doesn't propagate safe-area insets
          to SafeAreaView reliably; use outer insets directly. */}
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: '#F4F5F8' }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="flex-row items-center justify-between px-3 py-3">
            <Pressable onPress={handleClose} className="h-10 w-10 items-center justify-center" hitSlop={8}>
              <Ionicons name="close" size={24} color="#3B2A22" />
            </Pressable>
            <Text className="text-[17px] font-extrabold text-neutral-900">
              {t.report.sheet_title}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView className="flex-1" contentContainerClassName="px-4 pb-8">
            <Text className="mb-2 mt-2 px-1 text-[12px] font-semibold uppercase tracking-wider text-neutral-400">
              {t.report.select_reason}
            </Text>
            <View className="overflow-hidden rounded-[20px] bg-white">
              {REASONS.map((key, idx) => (
                <Pressable
                  key={key}
                  onPress={() => setReason(key)}
                  className="flex-row items-center justify-between px-4 py-3.5"
                  style={
                    idx < REASONS.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: '#EEF0F4' }
                      : undefined
                  }
                >
                  <Text className="text-[15px] text-neutral-900">{t.report.reasons[key]}</Text>
                  {reason === key ? (
                    <Ionicons name="checkmark-circle" size={20} color="#F47C7C" />
                  ) : (
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        borderWidth: 1.5,
                        borderColor: '#C4C9D4',
                      }}
                    />
                  )}
                </Pressable>
              ))}
            </View>

            <Text className="mb-2 mt-5 px-1 text-[12px] font-semibold uppercase tracking-wider text-neutral-400">
              {t.report.description_label}
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t.report.description_placeholder}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              maxLength={1000}
              className="rounded-[20px] bg-white px-4 py-3 text-[15px] text-neutral-900"
              style={{ minHeight: 110, textAlignVertical: 'top' }}
            />

            <Pressable
              onPress={() => setGoodFaith((v) => !v)}
              className="mt-5 flex-row items-start gap-3 rounded-[20px] bg-white px-4 py-4"
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: goodFaith ? '#F47C7C' : '#C4C9D4',
                  backgroundColor: goodFaith ? '#F47C7C' : '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                }}
              >
                {goodFaith ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
              </View>
              <Text className="flex-1 text-[13px] leading-5 text-neutral-700">
                {t.report.good_faith_label}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={!reason || submit.isPending}
              className={`mt-6 items-center rounded-full px-5 py-4 ${
                reason && !submit.isPending ? 'bg-[#F47C7C]' : 'bg-neutral-300'
              }`}
            >
              {submit.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-[15px] font-bold text-white">{t.report.submit}</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
