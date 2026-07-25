import { Text, View } from 'react-native';

import { GuideHintCard } from '../../components/GuideHintCard';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { SettingsRow } from '../../components/SettingsRow';
import { StateBlock } from '../../components/StateBlock';
import { SurfaceCard } from '../../components/SurfaceCard';
import { colors, spacing, typography } from '../../theme/tokens';

function StateHeading({ children }: { children: string }) {
  return <Text style={[typography.bodyStrong, { color: colors.textMain }]}>{children}</Text>;
}

const noop = () => undefined;

export default function ProductGuideGallery() {
  return (
    <Screen
      header={(
        <PageHeader
          title="First-value guide"
          subtitle="Normal · long German · empty · loading · self · other"
        />
      )}
      scroll
      bottomGap={spacing['2xl']}
      contentStyle={{ paddingHorizontal: spacing.xl, gap: spacing['2xl'] }}
    >
      <View style={{ gap: spacing.md }}>
        <StateHeading>1. Normal — Odyssey step hint</StateHeading>
        <GuideHintCard
          icon="flag-outline"
          title="Start with your first task"
          body="These tasks are built around what you told us. Open the first one to see exactly what to do."
          dismissLabel="Dismiss hint"
          onDismiss={noop}
          skipLabel="Skip the tour"
          onSkipAll={noop}
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>2. Long German</StateHeading>
        <GuideHintCard
          icon="flag-outline"
          title="Beginne mit deiner allerersten Verwaltungsaufgabe in der neuen Stadt"
          body="Diese Aufgaben basieren auf deinen Angaben zur Ankunftsphase und deinen Zielen. Öffne die erste Aufgabe, um Schritt für Schritt zu sehen, was genau zu tun ist und welche Unterlagen du brauchst."
          dismissLabel="Hinweis schließen"
          onDismiss={noop}
          skipLabel="Einführung überspringen"
          onSkipAll={noop}
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>3. Empty — guide completed or skipped</StateHeading>
        <StateBlock
          tone="neutral"
          icon="checkmark-circle-outline"
          title="Nothing is rendered"
          message="Once product_guide_version reaches the current version, no hint mounts anywhere. There is no residual chrome."
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>4. Loading — never blocks</StateHeading>
        <SurfaceCard tone="white" padding={spacing.lg}>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Guide telemetry and the completion PATCH are fire-and-forget: the hint advances
            locally in the same frame, so there is no spinner state to design for.
          </Text>
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>5. Self — Plaza step hint</StateHeading>
        <GuideHintCard
          icon="chatbubbles-outline"
          title="See how others did it"
          body="Plaza is where people on the same path share what actually worked. Open a post that matches your situation."
          dismissLabel="Dismiss hint"
          onDismiss={noop}
          skipLabel="Skip the tour"
          onSkipAll={noop}
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>6. Other — Settings re-entry row</StateHeading>
        <SurfaceCard tone="white" padding={0}>
          <SettingsRow
            icon="flag-outline"
            label="Getting-started tips"
            hint="Show the first-steps hints again"
            onPress={noop}
          />
        </SurfaceCard>
      </View>
    </Screen>
  );
}
