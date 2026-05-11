import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../components/AppBackground';
import { GlassCard } from '../components/GlassCard';
import { useLanguage } from '../context/LanguageContext';
import { useUpdateProfile } from '../features/auth/useAuth';
import { useAuthStore } from '../store/authStore';
import { colors, shadows } from '../theme/tokens';

const MAX_LENGTH = 200;

export default function EditBioScreen() {
  const { t } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();

  const initial = user?.bio ?? '';
  const [text, setText] = useState(initial);
  const dirty = text !== initial;

  const handleSave = () => {
    if (!user) return;
    // Empty string clears bio; backend stores NULL when blank. Trim to drop accidental whitespace.
    const next = text.trim();
    updateProfile.mutate(
      { bio: next.length === 0 ? null : next },
      {
        onSuccess: () => router.back(),
        onError: () => Alert.alert(t.common.error, t.common.error),
      },
    );
  };

  const handleBack = () => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert(t.profile.edit_bio_discard_title, t.profile.edit_bio_discard_body, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.profile.edit_bio_discard_action, style: 'destructive', onPress: () => router.back() },
    ]);
  };

  return (
    <AppBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 18,
              paddingVertical: 14,
            }}
          >
            <Pressable
              onPress={handleBack}
              hitSlop={8}
              style={({ pressed }) => [
                {
                  height: 42,
                  width: 42,
                  borderRadius: 21,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.86)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.85)',
                  ...shadows.iconButton,
                },
                pressed ? { transform: [{ scale: 0.94 }] } : null,
              ]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.textMain} />
            </Pressable>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.textMain, letterSpacing: -0.2 }}>
              {t.profile.edit_bio_title}
            </Text>
            <Pressable onPress={handleSave} disabled={updateProfile.isPending} hitSlop={8}>
              {updateProfile.isPending ? (
                <ActivityIndicator size="small" color={colors.brandCoral} />
              ) : (
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: dirty ? colors.brandCoral : colors.brandPeachLight,
                    opacity: dirty ? 1 : 0.6,
                  }}
                >
                  {t.common.save}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 12 }}>
            <GlassCard tone="white" radiusKey="3xl" padding={20}>
              <TextInput
                value={text}
                onChangeText={(value) => setText(value.slice(0, MAX_LENGTH))}
                placeholder={t.profile.edit_bio_placeholder}
                placeholderTextColor={colors.textSubtle}
                multiline
                maxLength={MAX_LENGTH}
                style={{
                  minHeight: 160,
                  fontSize: 15,
                  lineHeight: 23,
                  color: colors.textMain,
                  textAlignVertical: 'top',
                }}
                autoFocus
              />
              <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: colors.textSubtle }}>
                  {text.length}/{MAX_LENGTH}
                </Text>
              </View>
            </GlassCard>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppBackground>
  );
}
