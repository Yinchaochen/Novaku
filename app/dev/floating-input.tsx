import { useState } from 'react';
import { Text, View } from 'react-native';

import { KeyboardSafeTextInput } from '../../components/KeyboardSafeTextInput';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { StateBlock } from '../../components/StateBlock';
import { SurfaceCard } from '../../components/SurfaceCard';
import { colors, spacing, typography } from '../../theme/tokens';

function StateHeading({ children }: { children: string }) {
  return <Text style={[typography.bodyStrong, { color: colors.textMain }]}>{children}</Text>;
}

const LONG_DE =
  'Als ich zum ersten Mal zur Ausländerbehörde gegangen bin, hatte ich alle Unterlagen dabei, aber die Wartenummern waren schon um sieben Uhr morgens vergriffen — deshalb schreibe ich hier ausführlich auf, wie die Terminbuchung wirklich funktioniert.';

const fieldStyle = {
  borderRadius: 18,
  backgroundColor: '#FFF8F1',
  borderWidth: 1,
  borderColor: 'rgba(232, 221, 210, 0.72)',
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  lineHeight: 21,
  color: colors.textMain,
} as const;

export default function FloatingInputGallery() {
  const [liveValue, setLiveValue] = useState('');

  return (
    <Screen
      header={(
        <PageHeader
          title="Keyboard-safe input"
          subtitle="Normal · long German · empty · disabled · live sheet · loading"
        />
      )}
      scroll
      bottomGap={spacing['2xl']}
      contentStyle={{ paddingHorizontal: spacing.xl, gap: spacing['2xl'] }}
    >
      <View style={{ gap: spacing.md }}>
        <StateHeading>1. Normal — proxy showing a committed value</StateHeading>
        <SurfaceCard tone="white" padding={spacing.lg}>
          <KeyboardSafeTextInput
            testID="dev.floating.normal"
            value="Anmeldung at Rathaus Neukölln worked without an appointment"
            onChangeText={() => undefined}
            placeholder="Title"
            style={fieldStyle}
          />
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>2. Long German — multiline proxy grows with content</StateHeading>
        <SurfaceCard tone="white" padding={spacing.lg}>
          <KeyboardSafeTextInput
            testID="dev.floating.long-german"
            value={LONG_DE}
            onChangeText={() => undefined}
            placeholder="Beschreibung"
            multiline
            style={[fieldStyle, { minHeight: 110, textAlignVertical: 'top' }]}
          />
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>3. Empty — placeholder only</StateHeading>
        <SurfaceCard tone="white" padding={spacing.lg}>
          <KeyboardSafeTextInput
            testID="dev.floating.empty"
            value=""
            onChangeText={() => undefined}
            placeholder="Share your experience, question or tip…"
            multiline
            style={[fieldStyle, { minHeight: 80, textAlignVertical: 'top' }]}
          />
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>4. Disabled — press does nothing (BuddyPriceField free mode)</StateHeading>
        <SurfaceCard tone="white" padding={spacing.lg}>
          <KeyboardSafeTextInput
            testID="dev.floating.disabled"
            value=""
            onChangeText={() => undefined}
            placeholder="0.00"
            keyboardType="decimal-pad"
            disabled
            style={fieldStyle}
          />
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>5. Live — tap to open the real sheet, confirm writes back</StateHeading>
        <SurfaceCard tone="white" padding={spacing.lg}>
          <KeyboardSafeTextInput
            testID="dev.floating.live"
            value={liveValue}
            onChangeText={setLiveValue}
            placeholder="Tap me — the sheet floats above the keyboard"
            multiline
            maxLength={200}
            style={[fieldStyle, { minHeight: 80, textAlignVertical: 'top' }]}
          />
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 8 }]}>
            Committed value: {liveValue.length > 0 ? liveValue : '(empty until you confirm)'}
          </Text>
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>6. Loading — not applicable by design</StateHeading>
        <StateBlock
          tone="neutral"
          icon="flash-outline"
          title="Commit is synchronous"
          message="Confirm hands the draft to the host field's onChangeText in the same frame; network behaviour stays owned by the host form, so the sheet has no spinner state."
        />
      </View>
    </Screen>
  );
}
