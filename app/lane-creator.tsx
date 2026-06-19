import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import {
  LANE_SLOW_PHASES,
  useLaneQuota,
  useLaneSession,
  useRespondLaneSession,
  useStartLaneSession,
} from '../features/laneCreator/useLaneCreator';
import { colors } from '../theme/tokens';

// Conversational custom-task-line creator. A plain Expo Router screen (NOT a
// stacked Modal) so it never collides with the tab modals — see the
// fullScreen-modal-stacking gotcha. Drives the lane_creator backend:
// start session → AI elicits (with optional multi-choice) → research/compose
// (polled) → completed → tasks land in Odyssey.
export default function LaneCreatorScreen() {
  const { t } = useLanguage();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const quota = useLaneQuota();
  const sessionQ = useLaneSession(sessionId, Boolean(sessionId));
  const start = useStartLaneSession();
  const respond = useRespondLaneSession();

  const session = sessionQ.data;
  const status = session?.status;
  const remaining = quota.data ? Math.max(0, quota.data.limit - quota.data.used) : null;
  const busy = start.isPending || respond.isPending;
  const slow = (status != null && LANE_SLOW_PHASES.includes(status)) || busy;
  const eliciting = status === 'eliciting';
  const done = status === 'completed';
  const failed = status === 'failed';
  const quotaExceeded = status === 'quota_exceeded';

  const slowLabel =
    status === 'researching'
      ? t.laneCreator.researching
      : status === 'composing' || status === 'validating'
        ? t.laneCreator.composing
        : t.laneCreator.thinking;

  const handleStart = async () => {
    const text = draft.trim();
    if (!text || start.isPending) return;
    setDraft('');
    try {
      const s = await start.mutateAsync(text);
      setSessionId(s.id);
    } catch {
      setDraft(text);
    }
  };

  const handleSend = async (content: string, option?: string) => {
    const text = content.trim();
    if (!text || !sessionId || respond.isPending) return;
    if (!option) setDraft('');
    try {
      await respond.mutateAsync({ sessionId, content: text, selectedOption: option });
    } catch {
      if (!option) setDraft(text);
    }
  };

  const messages = session?.messages ?? [];
  const options = eliciting ? (session?.next_question?.options ?? null) : null;
  const showInput = (!session || eliciting) && !slow;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F7FB' }} edges={['top']}>
      <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="close" size={26} color={colors.textMain} />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.textMain }}>
          {t.laneCreator.header}
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {!session ? (
            <View className="rounded-3xl bg-white p-5" style={{ marginBottom: 16 }}>
              <Text
                style={{ fontSize: 16, fontWeight: '800', color: colors.textMain, marginBottom: 6 }}
              >
                {t.laneCreator.entry_title}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 19 }}>
                {t.laneCreator.entry_body}
              </Text>
            </View>
          ) : null}

          {messages.map((m, i) => (
            <View
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '86%',
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  backgroundColor: m.role === 'user' ? colors.brandCoral : '#FFFFFF',
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    lineHeight: 21,
                    color: m.role === 'user' ? '#FFFFFF' : colors.textMain,
                  }}
                >
                  {m.content}
                </Text>
              </View>
            </View>
          ))}

          {options && options.length > 0 ? (
            <View className="flex-row flex-wrap" style={{ gap: 8, marginTop: 2, marginBottom: 8 }}>
              {options.map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => void handleSend(opt, opt)}
                  disabled={busy}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: colors.brandCoral,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  <Text style={{ color: colors.brandCoral, fontWeight: '700', fontSize: 13 }}>
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {slow && !done ? (
            <View className="flex-row items-center" style={{ gap: 8, marginTop: 4 }}>
              <ActivityIndicator color={colors.brandCoral} />
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>{slowLabel}</Text>
            </View>
          ) : null}

          {done ? (
            <View className="rounded-3xl bg-white p-5" style={{ marginTop: 8, alignItems: 'center' }}>
              <Text
                style={{ fontSize: 18, fontWeight: '800', color: colors.textMain, marginBottom: 6 }}
              >
                {t.laneCreator.done_title}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textMuted,
                  textAlign: 'center',
                  marginBottom: 16,
                }}
              >
                {t.laneCreator.done_body}
              </Text>
              <Pressable
                onPress={() => router.replace('/(tabs)/tasks')}
                style={{
                  backgroundColor: colors.brandCoral,
                  borderRadius: 999,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                  {t.laneCreator.view_tasks}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {failed || quotaExceeded ? (
            <View className="rounded-2xl" style={{ backgroundColor: '#FFE8E3', padding: 14, marginTop: 8 }}>
              <Text style={{ color: '#B4451F', fontSize: 14, fontWeight: '600' }}>
                {quotaExceeded ? t.laneCreator.quota_exceeded : t.laneCreator.failed}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {showInput ? (
          <View
            className="flex-row items-end px-3 pb-3 pt-2"
            style={{ gap: 8, backgroundColor: '#F6F7FB' }}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={!session ? t.laneCreator.input_hint : ''}
              placeholderTextColor="#9AA3B2"
              multiline
              style={{
                flex: 1,
                maxHeight: 120,
                borderRadius: 20,
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 14,
                paddingTop: 10,
                paddingBottom: 10,
                fontSize: 15,
                color: colors.textMain,
              }}
            />
            <Pressable
              onPress={() => (session ? void handleSend(draft) : void handleStart())}
              disabled={!draft.trim() || busy}
              style={{
                height: 44,
                paddingHorizontal: 18,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: !draft.trim() || busy ? '#D6DBEA' : colors.brandCoral,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                {session ? t.laneCreator.send : t.laneCreator.start}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!session && remaining !== null ? (
          <Text
            style={{
              textAlign: 'center',
              color: colors.textMuted,
              fontSize: 12,
              paddingBottom: 10,
            }}
          >
            {remaining > 0
              ? t.laneCreator.quota_left.replace('{count}', String(remaining))
              : t.laneCreator.quota_none}
          </Text>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
