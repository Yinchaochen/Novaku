import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { SettingsHeader } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import {
  type AdminFeedbackItem,
  useAdminFeedback,
  useAdminFeedbackScreenshot,
  useSetFeedbackStatus,
} from '../../features/feedback/useFeedback';
import { colors } from '../../theme/tokens';

function FeedbackCard({ item }: { item: AdminFeedbackItem }) {
  const { t } = useLanguage();
  const [showShot, setShowShot] = useState(false);
  const shot = useAdminFeedbackScreenshot(showShot ? item.id : null);
  const setStatus = useSetFeedbackStatus();
  const done = item.status === 'done';
  const meta = [
    item.user_id ? `#${item.user_id.slice(0, 8)}` : t.feedback.admin_guest,
    item.contact_email,
    item.screen,
    [item.app_version, item.platform, item.os_version].filter(Boolean).join(' '),
    item.locale,
    item.created_at ? new Date(item.created_at).toLocaleString() : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        opacity: done ? 0.6 : 1,
      }}
    >
      <Text selectable style={{ fontSize: 15, lineHeight: 22, color: colors.textMain }}>
        {item.body}
      </Text>
      <Text selectable style={{ marginTop: 8, fontSize: 12, color: colors.textMuted }}>
        {meta}
      </Text>
      {showShot ? (
        shot.data ? (
          <Image
            source={{ uri: shot.data }}
            style={{ marginTop: 12, width: '100%', aspectRatio: 9 / 19, borderRadius: 12 }}
            contentFit="contain"
          />
        ) : (
          <ActivityIndicator style={{ marginTop: 12 }} color={colors.brandCoral} />
        )
      ) : null}
      <View style={{ flexDirection: 'row', gap: 18, marginTop: 12 }}>
        {item.has_screenshot && !showShot ? (
          <Pressable onPress={() => setShowShot(true)} hitSlop={8}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.brandCoral }}>
              {t.feedback.admin_show_screenshot}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => setStatus.mutate({ id: item.id, status: done ? 'new' : 'done' })}
          disabled={setStatus.isPending}
          hitSlop={8}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMuted }}>
            {done ? t.feedback.admin_mark_new : t.feedback.admin_mark_done}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AdminFeedbackScreen() {
  const { t } = useLanguage();
  const feedback = useAdminFeedback();

  return (
    <Screen topInset>
      <SettingsHeader title={t.feedback.admin_title} onBack={() => router.back()} />
      {feedback.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.brandCoral} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
          {(feedback.data ?? []).length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 40, color: colors.textMuted }}>
              {t.feedback.admin_empty}
            </Text>
          ) : (
            (feedback.data ?? []).map((item) => <FeedbackCard key={item.id} item={item} />)
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
