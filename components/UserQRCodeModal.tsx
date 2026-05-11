import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { useLanguage } from '../context/LanguageContext';
import { numericDisplayId, profileDeepLink } from '../lib/displayId';
import { resolveMediaUrl } from '../lib/media';

export interface UserQRCodeModalProps {
  visible: boolean;
  userId: string;
  /**
   * Real 10-digit display_id from the backend. Optional only for backward
   * compat — when omitted we fall back to the UUID-hashed pseudo-ID. New
   * callers should always pass it so the modal stays consistent with profile
   * pages and search results.
   */
  displayId?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  onClose: () => void;
}

function ModalAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const resolved = resolveMediaUrl(avatarUrl);
  if (resolved) {
    return (
      <Image
        source={resolved}
        contentFit="cover"
        style={{ width: 64, height: 64, borderRadius: 32 }}
      />
    );
  }
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: 64, height: 64, backgroundColor: '#FFE6EA' }}
    >
      <Text style={{ color: '#F47C7C', fontSize: 24, fontWeight: '700' }}>
        {name.trim().slice(0, 1).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

export function UserQRCodeModal({
  visible,
  userId,
  displayId,
  displayName,
  avatarUrl,
  onClose,
}: UserQRCodeModalProps) {
  const { t } = useLanguage();
  const numericId = displayId ?? numericDisplayId(userId);
  const deepLink = profileDeepLink(userId);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <Pressable className="flex-1 items-center justify-center px-8" onPress={onClose}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-[340px] items-center rounded-3xl bg-white px-6 pb-6 pt-8"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}
          >
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={{ position: 'absolute', top: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </Pressable>

            <ModalAvatar name={displayName} avatarUrl={avatarUrl} />
            <Text className="mt-3 text-[18px] font-bold text-black" numberOfLines={1}>
              {displayName}
            </Text>
            <Text className="mt-1 text-[12px] text-neutral-500">
              {t.profile.user_id_label}: {numericId}
            </Text>

            <View
              className="my-5 rounded-2xl bg-white p-4"
              style={{ borderWidth: 1, borderColor: '#F1F1F1' }}
            >
              <QRCode value={deepLink} size={200} backgroundColor="#FFFFFF" color="#111111" />
            </View>

            <Text className="text-center text-[12px] leading-4 text-neutral-400">
              {t.profile.qr_scan_hint}
            </Text>
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}
