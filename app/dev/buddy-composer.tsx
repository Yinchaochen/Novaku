import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton } from '../../components/GradientButton';
import { OPACITY_INCOMPLETE, publishButtonState } from '../../lib/publishButtonState';
import { colors, spacing, typography } from '../../theme/tokens';

/**
 * Dev-only gallery for the Buddy composer footer. The composer itself needs a
 * signed-in session against a live API, so the one thing worth looking at —
 * what the button says when the form is unfinished — could not be walked in a
 * browser. Plaza shipped that exact state broken for two months (D-127).
 *
 * Dev route under app/dev/: copy stays in English and out of the i18n pipeline.
 */

function Footer({ note, message, busy, ready }: {
  note: string;
  message: string | null;
  busy: boolean;
  ready: boolean;
}) {
  const button = publishButtonState({ isSubmitting: busy, isUploadingMedia: false, canSubmit: ready });
  return (
    <View style={styles.block}>
      <Text style={styles.note}>{note}</Text>
      <View style={styles.footer}>
        {message ? <Text style={styles.footerMessage}>{message}</Text> : null}
        <GradientButton
          label="Posten"
          loading={busy}
          disabled={button.disabled}
          style={button.disabled || ready ? undefined : styles.unfinished}
          fullWidth
          size="lg"
        />
      </View>
    </View>
  );
}

export default function BuddyComposerGallery() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 22 }}>
        <Text style={styles.heading}>Buddy composer footer</Text>
        <Footer note="Ready — solid, publishes" message={null} busy={false} ready />
        <Footer note="Unfinished, untouched — dimmed but pressable" message={null} busy={false} ready={false} />
        <Footer
          note="Unfinished, pressed — names the field and scrolls to it"
          message="Still missing: Price"
          busy={false}
          ready={false}
        />
        <Footer
          note="Long German, the field name that wraps"
          message="Fehlt noch: Stadt, in die geliefert werden soll"
          busy={false}
          ready={false}
        />
        <Footer note="Busy — the only state that cannot be pressed" message={null} busy ready />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.heading, color: colors.textMain },
  block: { gap: 8 },
  note: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineSoft,
    backgroundColor: 'rgba(255,248,241,0.96)',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  footerMessage: {
    ...typography.caption,
    color: colors.textDanger,
    marginBottom: spacing.sm,
  },
  unfinished: { opacity: OPACITY_INCOMPLETE },
});
