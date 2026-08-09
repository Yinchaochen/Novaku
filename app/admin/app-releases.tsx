import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { KeyboardSafeTextInput } from '../../components/KeyboardSafeTextInput';
import { Screen } from '../../components/Screen';
import { SettingsHeader } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import {
  AdminAppRelease,
  useAppReleases,
  useCreateAppRelease,
  useDeleteAppRelease,
  useUpdateAppRelease,
} from '../../features/admin/useAppReleases';
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
  multiline,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
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
        multiline={multiline}
        maxLength={multiline ? 1600 : 120}
        style={{
          marginTop: 6,
          minHeight: multiline ? 96 : 44,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.lineWarm,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: colors.textMain,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

export default function AdminAppReleasesScreen() {
  const { t } = useLanguage();
  const { data: releases, isLoading } = useAppReleases();
  const create = useCreateAppRelease();
  const update = useUpdateAppRelease();
  const remove = useDeleteAppRelease();

  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [highlights, setHighlights] = useState('');

  const lines = highlights
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const canSave = version.trim().length > 0 && title.trim().length > 0 && lines.length > 0;

  const handleCreate = () => {
    create.mutate(
      { version: version.trim(), title: title.trim(), highlights: lines, is_published: false },
      {
        onSuccess: () => {
          setVersion('');
          setTitle('');
          setHighlights('');
        },
        onError: () => Alert.alert(t.admin.releases_title, t.common.error),
      },
    );
  };

  const handleDelete = (item: AdminAppRelease) => {
    Alert.alert(t.admin.releases_delete_confirm_title, t.admin.releases_delete_confirm_body, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.admin.releases_delete, style: 'destructive', onPress: () => remove.mutate(item.id) },
    ]);
  };

  return (
    <Screen topInset>
      <SettingsHeader title={t.admin.releases_title} onBack={() => router.back()} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text className="text-[12px] leading-4" style={{ color: colors.textMuted }}>
          {t.admin.releases_hint}
        </Text>

        <View className="rounded-3xl p-4" style={CARD}>
          <Text className="text-[15px] font-extrabold" style={{ color: colors.textMain }}>
            {t.admin.releases_new}
          </Text>
          <Field
            label={t.admin.releases_version_label}
            value={version}
            placeholder={t.admin.releases_version_placeholder}
            onChangeText={setVersion}
          />
          <Field
            label={t.admin.releases_headline_label}
            value={title}
            placeholder={t.admin.releases_headline_placeholder}
            onChangeText={setTitle}
          />
          <Field
            label={t.admin.releases_highlights_label}
            value={highlights}
            placeholder={t.admin.releases_highlights_placeholder}
            onChangeText={setHighlights}
            multiline
          />
          <Pressable
            onPress={handleCreate}
            disabled={!canSave || create.isPending}
            className="mt-4 items-center rounded-full py-3"
            style={{ backgroundColor: canSave ? colors.brandCoral : colors.lineWarm }}
            testID="admin.releases.save"
          >
            <Text className="text-[13px] font-bold text-white">{t.admin.releases_save}</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator />
        ) : !releases || releases.length === 0 ? (
          <Text className="mt-6 text-center text-[13px]" style={{ color: colors.textMuted }}>
            {t.admin.releases_empty}
          </Text>
        ) : (
          releases.map((item) => (
            <View key={item.id} className="rounded-3xl p-4" style={CARD}>
              <View className="flex-row items-center justify-between">
                <Text className="text-[15px] font-extrabold" style={{ color: colors.textMain }}>
                  {item.version}
                </Text>
                <Text
                  className="text-[11px] font-bold"
                  style={{ color: item.is_published ? '#5C8A48' : colors.textSubtle }}
                >
                  {item.is_published ? t.admin.releases_published : t.admin.releases_draft}
                </Text>
              </View>

              <Text className="mt-2 text-[14px] font-bold" style={{ color: colors.textBrown }}>
                {item.title}
              </Text>
              {item.highlights.map((line, index) => (
                <Text
                  key={`${index}-${line}`}
                  className="mt-1 text-[13px] leading-5"
                  style={{ color: colors.textMuted }}
                >
                  · {line}
                </Text>
              ))}

              <Text className="mt-3 text-[11px]" style={{ color: colors.textSubtle }}>
                {t.admin.releases_locales.replace('{count}', String(item.locales.length))}
              </Text>

              <View className="mt-3 flex-row" style={{ gap: 10 }}>
                <Pressable
                  onPress={() => update.mutate({ id: item.id, is_published: !item.is_published })}
                  disabled={update.isPending}
                  className="flex-1 items-center rounded-full py-2.5"
                  style={{ backgroundColor: item.is_published ? colors.bgWarmDeep : '#8FBC7A' }}
                >
                  <Text
                    className="text-[13px] font-bold"
                    style={{ color: item.is_published ? colors.textBrown : '#FFFFFF' }}
                  >
                    {item.is_published ? t.admin.releases_unpublish : t.admin.releases_publish}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(item)}
                  disabled={remove.isPending}
                  className="items-center rounded-full px-5 py-2.5"
                  style={{ backgroundColor: colors.bgWarm }}
                >
                  <Text className="text-[13px] font-bold" style={{ color: colors.textMuted }}>
                    {t.admin.releases_delete}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
