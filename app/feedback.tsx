import { Ionicons } from '@expo/vector-icons';
import { isAxiosError } from 'axios';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassCard } from '../components/GlassCard';
import { GradientButton } from '../components/GradientButton';
import { Screen } from '../components/Screen';
import { SettingsHeader } from '../components/SettingsRow';
import { useLanguage } from '../context/LanguageContext';
import { WHATSAPP_GROUP_URL, useSendFeedback } from '../features/feedback/useFeedback';
import { openExternalUrl } from '../lib/links';
import { useAuthStore } from '../store/authStore';
import { useFeedbackDraftStore } from '../store/feedbackDraftStore';
import { colors } from '../theme/tokens';

const MAX_LENGTH = 4000;

export default function FeedbackScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const signedIn = useAuthStore((s) => Boolean(s.user));
  const screenshot = useFeedbackDraftStore((s) => s.screenshotBase64);
  const removeScreenshot = useFeedbackDraftStore((s) => s.removeScreenshot);
  const clearDraft = useFeedbackDraftStore((s) => s.clear);
  const send = useSendFeedback();
  const [body, setBody] = useState('');
  const [email, setEmail] = useState('');

  const close = () => {
    clearDraft();
    router.back();
  };

  const handleSend = () => {
    const text = body.trim();
    if (!text) return;
    send.mutate(
      { body: text, contactEmail: signedIn ? null : email.trim() || null },
      {
        onSuccess: () => {
          Alert.alert(t.feedback.sent);
          router.back();
        },
        onError: (error) => {
          const limited = isAxiosError(error) && error.response?.status === 429;
          Alert.alert(limited ? t.feedback.error_rate_limited : t.feedback.error_failed);
        },
      },
    );
  };

  return (
    <Screen
      scroll
      keyboard
      header={
        <View style={{ paddingTop: insets.top, backgroundColor: '#F4F5F8' }}>
          <SettingsHeader title={t.feedback.title} onBack={close} />
        </View>
      }
      contentStyle={{ paddingHorizontal: 18, paddingTop: 12, gap: 14 }}
      bottomGap={24}
      testID="feedback.screen"
    >
      <GlassCard tone="white" radiusKey="3xl" padding={18}>
        <TextInput
          value={body}
          onChangeText={(value) => setBody(value.slice(0, MAX_LENGTH))}
          placeholder={t.feedback.placeholder}
          placeholderTextColor={colors.textSubtle}
          multiline
          maxLength={MAX_LENGTH}
          autoFocus
          testID="feedback.body"
          style={{ minHeight: 140, fontSize: 15, lineHeight: 22, color: colors.textMain, textAlignVertical: 'top' }}
        />
      </GlassCard>

      {screenshot ? (
        <GlassCard tone="white" radiusKey="3xl" padding={16}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMain }}>
            {t.feedback.screenshot_label}
          </Text>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 12, alignItems: 'flex-start' }}>
            <Image
              source={{ uri: `data:image/jpeg;base64,${screenshot}` }}
              style={{ width: 96, height: 200, borderRadius: 10, backgroundColor: colors.bgWarmDeep }}
              contentFit="cover"
              testID="feedback.screenshot-preview"
            />
            <View style={{ flex: 1, gap: 10 }}>
              <Text style={{ fontSize: 13, lineHeight: 19, color: colors.textMuted }}>
                {t.feedback.screenshot_note}
              </Text>
              <Pressable onPress={removeScreenshot} hitSlop={8} testID="feedback.remove-screenshot">
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.brandCoral }}>
                  {t.feedback.screenshot_remove}
                </Text>
              </Pressable>
            </View>
          </View>
          <Text style={{ marginTop: 14, fontSize: 13, fontWeight: '700', color: colors.textMain }}>
            {t.feedback.purpose_title}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 19, color: colors.textMuted }}>
            {t.feedback.purpose_body}
          </Text>
        </GlassCard>
      ) : null}

      {signedIn ? null : (
        <GlassCard tone="white" radiusKey="3xl" padding={16}>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>{t.feedback.email_label}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            testID="feedback.email"
            style={{ marginTop: 6, fontSize: 15, color: colors.textMain, paddingVertical: 6 }}
          />
        </GlassCard>
      )}

      <GradientButton
        label={t.feedback.send}
        onPress={handleSend}
        loading={send.isPending}
        disabled={!body.trim()}
        fullWidth
      />

      <Pressable
        onPress={() => void openExternalUrl(WHATSAPP_GROUP_URL)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 }}
        testID="feedback.whatsapp"
      >
        <Ionicons name="logo-whatsapp" size={18} color={colors.textMuted} />
        <Text style={{ fontSize: 14, color: colors.textMuted }}>{t.feedback.whatsapp_inline}</Text>
      </Pressable>
    </Screen>
  );
}
