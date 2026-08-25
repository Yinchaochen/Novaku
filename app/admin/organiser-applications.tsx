import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { KeyboardSafeTextInput } from '../../components/KeyboardSafeTextInput';
import { Screen } from '../../components/Screen';
import { SettingsHeader } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import {
  OrganiserApplication,
  useCreateOrganiserApplication,
  useOrganiserApplications,
  useReviewOrganiserApplication,
  useSendClaimInvite,
} from '../../features/admin/useAdminOrganisers';
import { colors } from '../../theme/tokens';

const CARD = {
  borderWidth: 1,
  borderColor: colors.lineWarm,
  backgroundColor: colors.cardWhiteSolid,
} as const;

function Field({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text className="text-[11px] font-bold" style={{ color: colors.textMuted }}>
        {label}
      </Text>
      <KeyboardSafeTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        maxLength={320}
        style={{
          marginTop: 6,
          minHeight: 44,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.lineWarm,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: colors.textMain,
        }}
      />
    </View>
  );
}

function Chip({ label, tone }: { label: string; tone: 'good' | 'warn' | 'muted' }) {
  const palette = {
    good: { bg: 'rgba(143,188,122,0.18)', fg: '#5C8A48' },
    warn: { bg: 'rgba(176,122,30,0.12)', fg: '#B07A1E' },
    muted: { bg: 'rgba(0,0,0,0.06)', fg: '#9CA3AF' },
  }[tone];
  return (
    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: palette.bg }}>
      <Text className="text-[11px] font-bold" style={{ color: palette.fg }}>
        {label}
      </Text>
    </View>
  );
}

export default function AdminOrganiserApplicationsScreen() {
  const { t } = useLanguage();
  const pending = useOrganiserApplications('pending');
  const approved = useOrganiserApplications('approved');
  const create = useCreateOrganiserApplication();
  const review = useReviewOrganiserApplication();
  const invite = useSendClaimInvite();

  const [communityName, setCommunityName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [city, setCity] = useState('');
  const [calendarUrl, setCalendarUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const canCreate =
    communityName.trim().length >= 2 && contactEmail.includes('@') && city.trim().length >= 2;

  const handleCreate = () => {
    create.mutate(
      {
        community_name: communityName.trim(),
        contact_email: contactEmail.trim(),
        contact_name: contactName.trim(),
        city: city.trim(),
        calendar_url: calendarUrl.trim(),
        website_url: websiteUrl.trim(),
      },
      {
        onSuccess: () => {
          setCommunityName('');
          setContactEmail('');
          setContactName('');
          setCity('');
          setCalendarUrl('');
          setWebsiteUrl('');
        },
        onError: () => Alert.alert(t.admin.organisers_title, t.common.error),
      },
    );
  };

  const handleApprove = (item: OrganiserApplication) => {
    Alert.alert(t.admin.organisers_confirm_approve_title, t.admin.organisers_confirm_approve_body, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.admin.organisers_approve,
        onPress: () => review.mutate({ id: item.id, approve: true }),
      },
    ]);
  };

  const handleInvite = (item: OrganiserApplication) => {
    Alert.alert(
      t.admin.organisers_confirm_invite_title,
      t.admin.organisers_confirm_invite_body.replace('{email}', item.contact_email),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.admin.organisers_send_invite,
          onPress: () =>
            invite.mutate(item.id, {
              onError: () => Alert.alert(t.admin.organisers_title, t.common.error),
            }),
        },
      ],
    );
  };

  const isLoading = pending.isLoading || approved.isLoading;

  return (
    <Screen topInset>
      <SettingsHeader title={t.admin.organisers_title} onBack={() => router.back()} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text className="text-[12px] leading-4" style={{ color: colors.textMuted }}>
          {t.admin.organisers_hint}
        </Text>

        <View className="rounded-3xl p-4" style={CARD}>
          <Text className="text-[15px] font-extrabold" style={{ color: colors.textMain }}>
            {t.admin.organisers_invite_new}
          </Text>
          <Field
            label={t.admin.organisers_name_label}
            value={communityName}
            placeholder="Deep Work Club Berlin"
            onChangeText={setCommunityName}
          />
          <Field
            label={t.admin.organisers_email_label}
            value={contactEmail}
            placeholder="hello@example.com"
            onChangeText={setContactEmail}
          />
          <Field
            label={t.admin.organisers_contact_label}
            value={contactName}
            placeholder="Till"
            onChangeText={setContactName}
          />
          <Field
            label={t.admin.organisers_city_label}
            value={city}
            placeholder="berlin"
            onChangeText={setCity}
          />
          <Field
            label={t.admin.organisers_calendar_label}
            value={calendarUrl}
            placeholder="https://lu.ma/calendar/cal-…"
            onChangeText={setCalendarUrl}
          />
          <Field
            label={t.admin.organisers_website_label}
            value={websiteUrl}
            placeholder="https://…"
            onChangeText={setWebsiteUrl}
          />
          <Pressable
            onPress={handleCreate}
            disabled={!canCreate || create.isPending}
            className="mt-4 items-center rounded-full py-3"
            style={{ backgroundColor: canCreate ? colors.brandCoral : colors.lineWarm }}
          >
            <Text className="text-[13px] font-bold text-white">{t.admin.organisers_create}</Text>
          </Pressable>
        </View>

        <Text className="mt-2 text-[13px] font-extrabold" style={{ color: colors.textBrown }}>
          {t.admin.organisers_pending}
        </Text>
        {isLoading ? (
          <ActivityIndicator />
        ) : !pending.data || pending.data.length === 0 ? (
          <Text className="text-[13px]" style={{ color: colors.textMuted }}>
            {t.admin.organisers_empty}
          </Text>
        ) : (
          pending.data.map((item) => (
            <View key={item.id} className="rounded-3xl p-4" style={CARD}>
              <Text className="text-[15px] font-extrabold" style={{ color: colors.textMain }}>
                {item.community_name}
              </Text>
              <Text className="mt-0.5 text-[12px]" style={{ color: colors.textMuted }}>
                {item.contact_email}
                {item.contact_name ? ` · ${item.contact_name}` : ''} · {item.city}
              </Text>
              <View className="mt-2 flex-row flex-wrap" style={{ gap: 8 }}>
                <Chip
                  label={
                    item.calendar_recognised
                      ? t.admin.organisers_calendar_ok
                      : t.admin.organisers_calendar_unknown
                  }
                  tone={item.calendar_recognised ? 'good' : 'warn'}
                />
              </View>
              <View className="mt-3 flex-row" style={{ gap: 10 }}>
                <Pressable
                  onPress={() => handleApprove(item)}
                  disabled={review.isPending}
                  className="flex-1 items-center rounded-full py-2.5"
                  style={{ backgroundColor: '#8FBC7A' }}
                >
                  <Text className="text-[13px] font-bold text-white">
                    {t.admin.organisers_approve}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => review.mutate({ id: item.id, approve: false })}
                  disabled={review.isPending}
                  className="flex-1 items-center rounded-full py-2.5"
                  style={{ backgroundColor: colors.bgWarm }}
                >
                  <Text className="text-[13px] font-bold" style={{ color: colors.textMuted }}>
                    {t.admin.organisers_reject}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text className="mt-2 text-[13px] font-extrabold" style={{ color: colors.textBrown }}>
          {t.admin.organisers_approved}
        </Text>
        {isLoading ? null : !approved.data || approved.data.length === 0 ? (
          <Text className="text-[13px]" style={{ color: colors.textMuted }}>
            {t.admin.organisers_empty}
          </Text>
        ) : (
          approved.data.map((item) => {
            const placeholder = item.account_email?.startsWith('organiser+') ?? false;
            return (
              <View key={item.id} className="rounded-3xl p-4" style={CARD}>
                <Text className="text-[15px] font-extrabold" style={{ color: colors.textMain }}>
                  {item.community_name}
                </Text>
                <Text className="mt-0.5 text-[12px]" style={{ color: colors.textMuted }}>
                  {item.account_email ?? item.contact_email}
                </Text>
                <View className="mt-2 flex-row flex-wrap" style={{ gap: 8 }}>
                  <Chip
                    label={
                      item.claimed ? t.admin.organisers_claimed : t.admin.organisers_unclaimed
                    }
                    tone={item.claimed ? 'good' : 'muted'}
                  />
                </View>
                {item.claim_invite_sent_at ? (
                  <Text className="mt-2 text-[11px]" style={{ color: colors.textSubtle }}>
                    {t.admin.organisers_invite_sent.replace(
                      '{date}',
                      item.claim_invite_sent_at.slice(0, 10),
                    )}
                  </Text>
                ) : null}
                {placeholder ? (
                  <Text className="mt-3 text-[12px]" style={{ color: '#B07A1E' }}>
                    {t.admin.organisers_invite_blocked}
                  </Text>
                ) : item.claimed ? null : (
                  <Pressable
                    onPress={() => handleInvite(item)}
                    disabled={invite.isPending}
                    className="mt-3 items-center rounded-full py-2.5"
                    style={{ backgroundColor: colors.brandCoral }}
                  >
                    <Text className="text-[13px] font-bold text-white">
                      {t.admin.organisers_send_invite}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
