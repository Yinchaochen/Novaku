import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { KeyboardSafeTextInput } from '../../components/KeyboardSafeTextInput';
import { Screen } from '../../components/Screen';
import { SettingsHeader } from '../../components/SettingsRow';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { useLanguage } from '../../context/LanguageContext';
import { useAccountLookup, useSetAccountVerified } from '../../features/admin/useVerifiedAccounts';
import { colors } from '../../theme/tokens';

export default function AdminVerifiedAccountsScreen() {
  const { t } = useLanguage();
  const [displayId, setDisplayId] = useState('');
  const { account, setAccount, notFound, lookup } = useAccountLookup();
  const setVerified = useSetAccountVerified();

  const handleToggle = () => {
    if (!account) return;
    setVerified.mutate(
      { userId: account.id, verified: !account.is_verified },
      {
        onSuccess: (updated) => setAccount({ ...account, ...updated }),
        onError: () => Alert.alert(t.settings.admin_verified_title, t.common.error),
      },
    );
  };

  return (
    <Screen topInset>
      <SettingsHeader title={t.settings.admin_verified_title} onBack={() => router.back()} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text className="text-[12px] leading-4" style={{ color: colors.textMuted }}>
          {t.settings.admin_verified_hint}
        </Text>

        <View
          className="rounded-3xl p-4"
          style={{ borderWidth: 1, borderColor: colors.lineWarm, backgroundColor: colors.cardWhiteSolid }}
        >
          <Text className="text-[11px] font-bold" style={{ color: colors.textMuted }}>
            {t.settings.admin_verified_lookup_label}
          </Text>
          <KeyboardSafeTextInput
            value={displayId}
            onChangeText={setDisplayId}
            placeholder={t.settings.admin_verified_lookup_placeholder}
            placeholderTextColor={colors.textSubtle}
            keyboardType="number-pad"
            maxLength={10}
            testID="admin.verified.display-id"
            style={{
              marginTop: 6,
              minHeight: 44,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.lineWarm,
              paddingHorizontal: 12,
              color: colors.textMain,
            }}
          />
          <Pressable
            onPress={() => lookup.mutate(displayId.trim())}
            disabled={displayId.trim().length === 0 || lookup.isPending}
            className="mt-4 items-center rounded-full py-3"
            style={{
              backgroundColor: displayId.trim().length > 0 ? colors.brandCoral : colors.lineWarm,
            }}
            testID="admin.verified.lookup"
          >
            <Text className="text-[13px] font-bold text-white">
              {t.settings.admin_verified_lookup_cta}
            </Text>
          </Pressable>
        </View>

        {lookup.isPending ? <ActivityIndicator /> : null}

        {notFound ? (
          <Text className="text-center text-[13px]" style={{ color: colors.textMuted }}>
            {t.settings.admin_verified_not_found}
          </Text>
        ) : null}

        {account ? (
          <View
            className="rounded-3xl p-4"
            style={{ borderWidth: 1, borderColor: colors.lineWarm, backgroundColor: colors.cardWhiteSolid }}
            testID="admin.verified.result"
          >
            <View className="flex-row items-center">
              <Text className="shrink text-[16px] font-extrabold" style={{ color: colors.textMain }}>
                {account.display_name}
              </Text>
              {account.is_verified ? <VerifiedBadge size={16} /> : null}
            </View>
            <Text className="mt-1 text-[12px]" style={{ color: colors.textSubtle }}>
              #{account.display_id}
              {account.city ? ` · ${account.city}` : ''}
            </Text>
            <Text
              className="mt-2 text-[12px] font-bold"
              style={{ color: account.is_verified ? '#5C8A48' : colors.textSubtle }}
            >
              {account.is_verified
                ? t.settings.admin_verified_state_on
                : t.settings.admin_verified_state_off}
            </Text>

            <Pressable
              onPress={handleToggle}
              disabled={setVerified.isPending}
              className="mt-4 items-center rounded-full py-3"
              style={{ backgroundColor: account.is_verified ? colors.bgWarmDeep : '#8FBC7A' }}
              testID="admin.verified.toggle"
            >
              <Text
                className="text-[13px] font-bold"
                style={{ color: account.is_verified ? colors.textBrown : '#FFFFFF' }}
              >
                {account.is_verified
                  ? t.settings.admin_verified_revoke
                  : t.settings.admin_verified_grant}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
