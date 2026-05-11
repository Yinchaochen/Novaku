import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import { useUpdateProfile } from '../features/auth/useAuth';
import { useAuthStore } from '../store/authStore';

type VisibilityKey =
  | 'tab_notes_public'
  | 'tab_comments_public'
  | 'tab_saves_public'
  | 'tab_likes_public';

export interface PrivacyModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PrivacyModal({ visible, onClose }: PrivacyModalProps) {
  const { t } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();

  const rows: { key: VisibilityKey; label: string }[] = [
    { key: 'tab_notes_public', label: t.profile.privacy_tab_notes_label },
    { key: 'tab_comments_public', label: t.profile.privacy_tab_comments_label },
    { key: 'tab_saves_public', label: t.profile.privacy_tab_saves_label },
    { key: 'tab_likes_public', label: t.profile.privacy_tab_likes_label },
  ];

  const handleToggle = (key: VisibilityKey, next: boolean) => {
    if (!user) return;
    updateProfile.mutate({ [key]: next });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32 }}>
          <View className="px-5 pt-4">
            <View className="mb-4 items-center">
              <View className="h-1 w-10 rounded-full bg-neutral-200" />
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-[20px] font-extrabold text-neutral-900">
                {t.profile.privacy_title}
              </Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={22} color="#9CA3AF" />
              </Pressable>
            </View>
            <Text className="mt-1 text-[13px] leading-5 text-neutral-500">
              {t.profile.privacy_subtitle}
            </Text>

            <ScrollView className="mt-5" showsVerticalScrollIndicator={false}>
              <Text className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-neutral-400">
                {t.profile.privacy_section_tabs_title}
              </Text>
              <View className="overflow-hidden rounded-2xl bg-[#F4F5F8]">
                {rows.map((row, idx) => {
                  const value = (user?.[row.key] ?? true) as boolean;
                  return (
                    <View
                      key={row.key}
                      className="flex-row items-center justify-between px-4 py-3.5"
                      style={
                        idx < rows.length - 1
                          ? { borderBottomWidth: 1, borderBottomColor: '#E8E9EE' }
                          : undefined
                      }
                    >
                      <View className="flex-1 pr-3">
                        <Text className="text-[15px] font-semibold text-neutral-900">{row.label}</Text>
                        <Text className="mt-0.5 text-[12px] text-neutral-500">
                          {value
                            ? t.profile.privacy_visible_to_others
                            : t.profile.privacy_hidden_from_others}
                        </Text>
                      </View>
                      <Switch
                        value={value}
                        onValueChange={(next) => handleToggle(row.key, next)}
                        disabled={updateProfile.isPending}
                        trackColor={{ false: '#D1D5DB', true: '#F47C7C' }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  );
                })}
              </View>

              <Text className="mt-3 px-1 text-[12px] leading-5 text-neutral-400">
                {t.profile.privacy_self_always_visible_hint}
              </Text>
              <View className="h-6" />
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
