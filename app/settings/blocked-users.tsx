import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import { resolveMediaUrl } from '../../lib/media';
import { useBlockedUsers, useUnblockUser } from '../../features/social/useSocial';

export default function BlockedUsersScreen() {
  const { t } = useLanguage();
  const blockedQuery = useBlockedUsers();
  const unblock = useUnblockUser();

  const handleUnblock = (userId: string, displayName: string) => {
    Alert.alert(
      t.settings.blocked_unblock_confirm_title,
      t.settings.blocked_unblock_confirm_body.replace('{name}', displayName),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.settings.blocked_unblock_action,
          onPress: () => {
            unblock.mutate(userId, {
              onError: () => Alert.alert(t.common.error),
            });
          },
        },
      ],
    );
  };

  const items = blockedQuery.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top']}>
      <SettingsHeader title={t.settings.blocked_users_title} onBack={() => router.back()} />

      <ScrollView className="flex-1" contentContainerClassName="pb-12 pt-2">
        <Text className="px-5 pb-3 text-[12px] leading-5 text-neutral-500">
          {t.settings.blocked_users_explainer}
        </Text>

        {blockedQuery.isLoading ? (
          <View className="items-center py-10">
            <ActivityIndicator size="small" color="#F47C7C" />
          </View>
        ) : items.length === 0 ? (
          <View className="mx-4 items-center rounded-[20px] bg-white px-5 py-10">
            <Ionicons name="shield-checkmark-outline" size={36} color="#C4C9D4" />
            <Text className="mt-3 text-[14px] font-semibold text-[#3B2A22]">
              {t.settings.blocked_users_empty_title}
            </Text>
            <Text className="mt-1 text-center text-[12px] leading-4 text-neutral-500">
              {t.settings.blocked_users_empty_body}
            </Text>
          </View>
        ) : (
          <View className="mx-4 overflow-hidden rounded-[20px] bg-white">
            {items.map((entry, index) => {
              const avatarUrl = resolveMediaUrl(entry.user.avatar_url);
              const initial = entry.user.display_name.trim().slice(0, 1).toUpperCase() || 'N';
              return (
                <View
                  key={entry.user.id}
                  className="flex-row items-center gap-3 px-4 py-3"
                  style={
                    index < items.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: '#F4F5F8' }
                      : undefined
                  }
                >
                  {avatarUrl ? (
                    <Image
                      source={avatarUrl}
                      style={{ width: 40, height: 40, borderRadius: 20 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      className="h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: '#F4E3FF' }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#1F2937' }}>
                        {initial}
                      </Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-[#3B2A22]" numberOfLines={1}>
                      {entry.user.display_name}
                    </Text>
                    {entry.user.city ? (
                      <Text className="mt-0.5 text-[12px] text-neutral-500" numberOfLines={1}>
                        {entry.user.city}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => handleUnblock(entry.user.id, entry.user.display_name)}
                    disabled={unblock.isPending}
                    hitSlop={6}
                    className="rounded-full border border-neutral-300 px-3 py-1.5"
                  >
                    <Text className="text-[13px] font-semibold text-[#3B2A22]">
                      {t.settings.blocked_unblock_action}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
