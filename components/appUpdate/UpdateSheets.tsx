import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientButton } from '../GradientButton';
import { useLanguage } from '../../context/LanguageContext';
import type { ReleaseNotes } from '../../lib/appVersion';
import { colors, radius } from '../../theme/tokens';

const BACKDROP = 'rgba(36, 26, 22, 0.55)';

function Highlights({ notes }: { notes: ReleaseNotes | null }) {
  if (!notes || notes.highlights.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      {notes.highlights.map((line, index) => (
        <View key={`${index}-${line}`} className="flex-row" style={{ gap: 10 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              marginTop: 7,
              backgroundColor: colors.brandCoral,
            }}
          />
          <Text
            className="flex-1 text-[14px] leading-5"
            style={{ color: colors.textBrown }}
            testID="app-update.highlight"
          >
            {line}
          </Text>
        </View>
      ))}
    </View>
  );
}

interface SheetShellProps {
  visible: boolean;
  onDismiss?: () => void;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}

function SheetShell({ visible, onDismiss, eyebrow, title, children }: SheetShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      // A forced update passes no onDismiss: Android back must not escape it.
      onRequestClose={onDismiss ?? (() => {})}
    >
      <Pressable
        onPress={onDismiss}
        className="flex-1 justify-end"
        style={{ backgroundColor: BACKDROP }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.bgCream,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 28) : 28,
            maxHeight: '82%',
          }}
        >
          {onDismiss ? (
            <View
              style={{
                alignSelf: 'center',
                width: 40,
                height: 4,
                borderRadius: radius.pill,
                backgroundColor: colors.lineWarm,
                marginBottom: 18,
              }}
            />
          ) : (
            <View style={{ height: 4, marginBottom: 18 }} />
          )}

          <Text
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: colors.brandCoral }}
          >
            {eyebrow}
          </Text>
          <Text
            className="mt-2 text-[22px] font-extrabold leading-7"
            style={{ color: colors.textMain }}
          >
            {title}
          </Text>

          <ScrollView
            className="mt-4"
            contentContainerStyle={{ paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function WhatsNewSheet({
  visible,
  notes,
  onClose,
}: {
  visible: boolean;
  notes: ReleaseNotes | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  if (!notes) return null;

  return (
    <SheetShell
      visible={visible}
      onDismiss={onClose}
      eyebrow={t.app_update.whats_new_eyebrow.replace('{version}', notes.version)}
      title={notes.title}
    >
      <Highlights notes={notes} />
      <GradientButton
        label={t.app_update.whats_new_cta}
        onPress={onClose}
        fullWidth
        style={{ marginTop: 24 }}
      />
    </SheetShell>
  );
}

export function UpdateAvailableSheet({
  visible,
  version,
  notes,
  onUpdate,
  onLater,
}: {
  visible: boolean;
  version: string;
  notes: ReleaseNotes | null;
  onUpdate: () => void;
  onLater: () => void;
}) {
  const { t } = useLanguage();

  return (
    <SheetShell
      visible={visible}
      onDismiss={onLater}
      eyebrow={t.app_update.available_eyebrow}
      title={t.app_update.available_title.replace('{version}', version)}
    >
      <Text className="text-[14px] leading-5" style={{ color: colors.textMuted }}>
        {t.app_update.available_body}
      </Text>
      <View style={{ marginTop: 16 }}>
        <Highlights notes={notes} />
      </View>
      <GradientButton
        label={t.app_update.update_cta}
        onPress={onUpdate}
        fullWidth
        style={{ marginTop: 24 }}
      />
      <Pressable onPress={onLater} className="items-center py-4" testID="app-update.later">
        <Text className="text-[14px]" style={{ color: colors.textMuted }}>
          {t.app_update.later_cta}
        </Text>
      </Pressable>
    </SheetShell>
  );
}

export function UpdateRequiredSheet({
  visible,
  version,
  notes,
  onUpdate,
}: {
  visible: boolean;
  version: string;
  notes: ReleaseNotes | null;
  onUpdate: () => void;
}) {
  const { t } = useLanguage();

  return (
    <SheetShell
      visible={visible}
      eyebrow={t.app_update.required_eyebrow}
      title={t.app_update.required_title.replace('{version}', version)}
    >
      <Text className="text-[14px] leading-5" style={{ color: colors.textMuted }}>
        {t.app_update.required_body}
      </Text>
      <View style={{ marginTop: 16 }}>
        <Highlights notes={notes} />
      </View>
      <GradientButton
        label={t.app_update.update_cta}
        onPress={onUpdate}
        fullWidth
        style={{ marginTop: 24 }}
      />
    </SheetShell>
  );
}
