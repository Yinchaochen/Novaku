import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps, useRef } from 'react';
import { Modal, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import {
  copyLink,
  shareToInstagramStory,
  shareToSystemSheet,
  shareToTelegram,
  shareToWhatsApp,
} from '../lib/share';
import { colors, fontFamily, radius, shadows, spacing } from '../theme/tokens';

type TargetKey = 'story' | 'whatsapp' | 'telegram' | 'copy' | 'more';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Lazily captures the off-screen branded card to a PNG file uri (or null). */
  capture: () => Promise<string | null>;
  /** Canonical share URL — used by Copy and the Instagram Story link sticker. */
  linkUrl: string;
  /** Full text body for messaging apps; the parent builds it to include linkUrl. */
  message: string;
  /** Generic "copied to clipboard" toast (Copy button). */
  onCopied: () => void;
  /** Instagram Story auto-copies the link; this fires the "link sticker" toast. */
  onStoryLinkCopied?: () => void;
}

// Brand-styled share panel reused by Plaza posts and the profile name card.
// A horizontal row of one-tap targets (Instagram Story / WhatsApp / Telegram /
// Copy link) plus "More" → the OS share sheet, which covers every other app
// (Signal, Messages, Mail, X, AirDrop, …).
export function ShareSheet({
  visible,
  onClose,
  capture,
  linkUrl,
  message,
  onCopied,
  onStoryLinkCopied,
}: Props) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const sheetWidth = Math.min(width - spacing.lg * 2, 520);
  const pending = useRef<TargetKey | null>(null);

  const run = async (key: TargetKey) => {
    if (key === 'copy') {
      if (await copyLink(linkUrl)) onCopied();
      return;
    }
    const uri = await capture();
    if (!uri) return;
    if (key === 'story') {
      await shareToInstagramStory({ imageUri: uri, linkUrl, onLinkCopied: onStoryLinkCopied });
    } else if (key === 'whatsapp') {
      await shareToWhatsApp({ imageUri: uri, message });
    } else if (key === 'telegram') {
      await shareToTelegram({ imageUri: uri, message });
    } else {
      await shareToSystemSheet({ imageUri: uri, message });
    }
  };

  // iOS can't present a native share UI while this Modal is still dismissing
  // (present-while-dismissing race). Defer the action until the sheet has fully
  // dismissed (onDismiss). Android never fires onDismiss, so run inline.
  const select = (key: TargetKey) => {
    if (Platform.OS === 'ios') {
      pending.current = key;
      onClose();
      return;
    }
    onClose();
    void run(key);
  };

  // Instagram / WhatsApp / Telegram are trademarks — intentionally NOT routed
  // through i18n (they read identically in every locale, matching the project's
  // proper-noun preservation convention). Only generic verbs are localized.
  const targets: {
    key: TargetKey;
    label: string;
    icon: ComponentProps<typeof Ionicons>['name'];
    bg: string;
    fg: string;
  }[] = [
    { key: 'story', label: 'Instagram', icon: 'logo-instagram', bg: '#FCE7F0', fg: '#C13584' },
    { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', bg: '#E3F7EC', fg: '#25D366' },
    { key: 'telegram', label: 'Telegram', icon: 'paper-plane', bg: '#E4F2FB', fg: '#229ED9' },
    { key: 'copy', label: t.common.share_copy_link, icon: 'link', bg: colors.bgWarm, fg: colors.textBrown },
    { key: 'more', label: t.common.share_more, icon: 'ellipsis-horizontal', bg: colors.bgWarm, fg: colors.textBrown },
  ];

  const itemWidth = (sheetWidth - spacing.lg * 2) / targets.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={() => {
        const next = pending.current;
        pending.current = null;
        if (next) void run(next);
      }}
      statusBarTranslucent
    >
      <Pressable
        onPress={onClose}
        accessibilityViewIsModal
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(36, 26, 22, 0.52)',
          paddingBottom: Math.max(insets.bottom, spacing.md),
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: sheetWidth,
            borderRadius: radius['2xl'],
            borderWidth: 1,
            borderColor: colors.lineWarm,
            backgroundColor: colors.bgCream,
            paddingBottom: spacing.xl,
            ...shadows.cardLg,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 42,
              height: 5,
              marginTop: spacing.sm,
              borderRadius: radius.pill,
              backgroundColor: colors.bgWarmDeep,
            }}
          />

          <Text
            style={{
              marginTop: spacing.md,
              marginBottom: spacing.lg,
              textAlign: 'center',
              fontFamily: fontFamily.displayBold,
              fontSize: 17,
              fontWeight: '700',
              color: colors.textMain,
            }}
          >
            {t.common.share_sheet_title}
          </Text>

          <View style={{ flexDirection: 'row', paddingHorizontal: spacing.lg }}>
            {targets.map((tg) => (
              <Pressable
                key={tg.key}
                onPress={() => select(tg.key)}
                accessibilityRole="button"
                accessibilityLabel={tg.label}
                style={({ pressed }) => ({
                  width: itemWidth,
                  alignItems: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: tg.bg,
                  }}
                >
                  <Ionicons name={tg.icon} size={26} color={tg.fg} />
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: spacing.sm,
                    maxWidth: itemWidth - 2,
                    fontSize: 11.5,
                    fontFamily: fontFamily.medium,
                    fontWeight: '600',
                    color: colors.textMuted,
                  }}
                >
                  {tg.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
