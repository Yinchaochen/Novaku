import { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { ListRow } from '../../components/ListRow';
import { PageHeader } from '../../components/PageHeader';
import { OdysseyTaskLineCard } from '../../components/recipes/OdysseyTaskLineCard';
import { Screen } from '../../components/Screen';
import { EmptyState, ErrorState, LoadingState, StateBlock } from '../../components/StateBlock';
import { SurfaceCard } from '../../components/SurfaceCard';
import { colors, spacing } from '../../theme/tokens';

const LONG_DE =
  'Aufenthaltstitel-Verlaengerung und Wohnungsgeberbestaetigung vor dem Buergeramt-Termin pruefen';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SurfaceCard shadow="none" style={{ gap: spacing.md }}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textSubtle, textTransform: 'uppercase' }}>
        {title}
      </Text>
      {children}
    </SurfaceCard>
  );
}
export default function UiSystemGallery() {
  return (
    <Screen
      header={<PageHeader title="UI system" subtitle="Agent-operable primitives and recipes" />}
      scroll
      bottomGap={28}
      contentClassName="px-5 gap-4"
    >
      <Section title="SurfaceCard">
        <View style={{ gap: spacing.md }}>
          {(['white', 'cream', 'warm', 'lavender', 'sage'] as const).map((tone) => (
            <SurfaceCard key={tone} tone={tone} shadow="none">
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textMain }}>{tone}</Text>
              <Text style={{ marginTop: 4, color: colors.textMuted }}>{LONG_DE}</Text>
            </SurfaceCard>
          ))}
        </View>
      </Section>

      <Section title="ListRow">
        <View style={{ gap: spacing.md }}>
          <ListRow
            icon="home-outline"
            tone="gold"
            title="Settle down in Germany"
            subtitle={LONG_DE}
            meta="7 tasks"
          />
          <ListRow
            icon="leaf-outline"
            tone="sage"
            title="Local side quests"
            subtitle="Saved places and personal tasks from Plaza."
            onPress={() => undefined}
          />
        </View>
      </Section>

      <Section title="StateBlock">
        <View style={{ gap: spacing.md }}>
          <EmptyState title="Nothing here yet" message={LONG_DE} actionLabel="Explore Plaza" onAction={() => undefined} />
          <LoadingState title="Building your path" message="Collecting verified local steps." />
          <ErrorState title="Could not load" message="Try again when the connection is back." actionLabel="Retry" onAction={() => undefined} />
          <StateBlock title="All caught up" message="Your local checklist is quiet for now." icon="checkmark-circle-outline" tone="success" />
        </View>
      </Section>

      <Section title="OdysseyTaskLineCard recipe">
        <View style={{ gap: spacing.md }}>
          <OdysseyTaskLineCard
            title="Settle down in Germany"
            subtitle="Housing, registration, insurance and the core steps that belong together."
            icon="home-outline"
            tone="gold"
            activeCount={7}
            countLabel="{count} active tasks"
            onPress={() => undefined}
          />
          <OdysseyTaskLineCard
            title={LONG_DE}
            subtitle="Long German title stress test for two-line wrapping and static card shell."
            icon="sparkles-outline"
            tone="lavender"
            activeCount={2}
            countLabel="{count} active tasks"
            onPress={() => undefined}
          />
        </View>
      </Section>
    </Screen>
  );
}
