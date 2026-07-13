import { ReactNode, useState } from 'react';
import { Text, View } from 'react-native';

import { GradientButton } from '../../components/GradientButton';
import { ListRow } from '../../components/ListRow';
import { PageHeader } from '../../components/PageHeader';
import { OdysseyTaskLineCard } from '../../components/recipes/OdysseyTaskLineCard';
import { Screen } from '../../components/Screen';
import { EmptyState, ErrorState, LoadingState, StateBlock } from '../../components/StateBlock';
import { SurfaceCard } from '../../components/SurfaceCard';
import { CommunityPostImageViewer } from '../../features/community/CommunityPostImageViewer';
import { colors, spacing } from '../../theme/tokens';

const LONG_DE =
  'Aufenthaltstitel-Verlaengerung und Wohnungsgeberbestaetigung vor dem Buergeramt-Termin pruefen';
const IMAGE_VIEWER_PREVIEW = [
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600"><rect width="1200" height="1600" fill="%23F67673"/><circle cx="600" cy="720" r="260" fill="%23FFF8F1"/><text x="600" y="790" text-anchor="middle" font-size="220" font-family="sans-serif" fill="%23241A16">1</text></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="%23A99BFF"/><circle cx="800" cy="500" r="260" fill="%23FFF8F1"/><text x="800" y="570" text-anchor="middle" font-size="220" font-family="sans-serif" fill="%23241A16">2</text></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1400"><rect width="1000" height="1400" fill="%23CFE3C1"/><circle cx="500" cy="650" r="240" fill="%23FFF8F1"/><text x="500" y="720" text-anchor="middle" font-size="220" font-family="sans-serif" fill="%23241A16">3</text></svg>',
];

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
  const [viewerMode, setViewerMode] = useState<'multi' | 'single' | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openViewer = (mode: 'multi' | 'single') => {
    setViewerIndex(0);
    setViewerMode(mode);
  };

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

      <Section title="Community post image viewer recipe">
        <View style={{ gap: spacing.sm }}>
          <GradientButton
            label="Open multi-image viewer"
            variant="secondary"
            fullWidth
            onPress={() => openViewer('multi')}
          />
          <GradientButton
            label="Open single-image viewer"
            variant="ghost"
            fullWidth
            onPress={() => openViewer('single')}
          />
        </View>
      </Section>

      <CommunityPostImageViewer
        visible={viewerMode !== null}
        mediaUrls={viewerMode === 'single' ? IMAGE_VIEWER_PREVIEW.slice(0, 1) : IMAGE_VIEWER_PREVIEW}
        activeIndex={viewerIndex}
        closeLabel="Close image viewer"
        previousLabel="Previous image"
        nextLabel="Next image"
        onClose={() => setViewerMode(null)}
        onIndexChange={setViewerIndex}
      />
    </Screen>
  );
}
