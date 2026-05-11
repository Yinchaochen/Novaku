import { router } from 'expo-router';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';

interface PaywallSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Optional: which feature triggered the paywall, for the headline copy. */
  feature?: 'tasks' | 'ai_chat' | 'doc_ocr' | 'generic';
}

/**
 * Reusable paywall overlay for free users hitting a limit. Tapping "Upgrade"
 * routes to /billing/subscribe. Tapping the backdrop or Close dismisses.
 */
export function PaywallSheet({ visible, onClose, feature = 'generic' }: PaywallSheetProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const headlineKey = `paywall_${feature}_headline` as const;
  const bodyKey = `paywall_${feature}_body` as const;
  const headline = (t.billing[headlineKey] as string | undefined) ?? t.billing.paywall_generic_headline;
  const body = (t.billing[bodyKey] as string | undefined) ?? t.billing.paywall_generic_body;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(20, 32, 42, 0.55)' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-[#F2EDE3] rounded-t-[28px] px-6 pt-5"
          style={{ paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 40) : 40 }}
        >
          <View className="self-center w-10 h-1 rounded-full bg-neutral-300 mb-5" />

          <Text className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#C76F4A' }}>
            Postervia+
          </Text>
          <Text className="text-[22px] font-extrabold text-neutral-900 leading-7 mb-3">
            {headline}
          </Text>
          <Text className="text-[14px] leading-5 text-neutral-700 mb-6">{body}</Text>

          <Pressable
            onPress={() => {
              onClose();
              router.push('/billing/subscribe' as never);
            }}
            className="rounded-3xl py-4 items-center"
            style={{ backgroundColor: '#C76F4A' }}
          >
            <Text className="text-white font-bold text-[15px]">{t.billing.upgrade_cta}</Text>
          </Pressable>

          <Pressable onPress={onClose} className="py-4 items-center mt-1">
            <Text className="text-[14px] text-neutral-500">{t.billing.maybe_later}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
