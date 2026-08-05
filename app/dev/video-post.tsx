import { useState } from 'react';
import { Text, View } from 'react-native';

import { GradientButton } from '../../components/GradientButton';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { StateBlock } from '../../components/StateBlock';
import { SurfaceCard } from '../../components/SurfaceCard';
import { VideoFullscreenModal } from '../../components/community/VideoFullscreenModal';
import { colors, spacing, typography } from '../../theme/tokens';

function StateHeading({ children }: { children: string }) {
  return <Text style={[typography.bodyStrong, { color: colors.textMain }]}>{children}</Text>;
}

// Public MP4 test clip (dev-only, never shipped into a user path).
const SAMPLE_VIDEO = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';

function ChipPreview({ label, tone }: { label: string; tone: 'review' | 'rejected' }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 4,
        backgroundColor: tone === 'rejected' ? 'rgba(184, 58, 58, 0.92)' : 'rgba(17, 17, 17, 0.68)',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export default function VideoPostGallery() {
  const [playerOpen, setPlayerOpen] = useState(false);
  const [helpful, setHelpful] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <Screen
      header={(
        <PageHeader
          title="Video post"
          subtitle="Card badges · status chips · composer preview · live player"
        />
      )}
      scroll
      bottomGap={spacing['2xl']}
      contentStyle={{ paddingHorizontal: spacing.xl, gap: spacing['2xl'] }}
    >
      <View style={{ gap: spacing.md }}>
        <StateHeading>1. Normal — feed card affordance (play glyph + duration)</StateHeading>
        <SurfaceCard tone="white" padding={spacing.lg}>
          <View style={{ height: 150, borderRadius: 18, backgroundColor: '#1F1B18', overflow: 'hidden' }}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.22)',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 18 }}>▶</Text>
              </View>
            </View>
            <View
              style={{
                position: 'absolute',
                right: 8,
                bottom: 8,
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 3,
                backgroundColor: 'rgba(0,0,0,0.55)',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' }}>1:35</Text>
            </View>
          </View>
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>2. Long German — author status chips</StateHeading>
        <SurfaceCard tone="white" padding={spacing.lg}>
          <View style={{ gap: 8 }}>
            <ChipPreview label="In Prüfung" tone="review" />
            <ChipPreview label="Nicht freigegeben" tone="rejected" />
            <Text style={[typography.body, { color: colors.textMuted }]}>
              Nur die Autorin sieht diese Chips — öffentlich erscheint der Beitrag erst nach
              bestandener Prüfung (XHS-Modell: sofort selbst sichtbar, verteilt nach Freigabe).
            </Text>
          </View>
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>3. Empty — no video in post</StateHeading>
        <StateBlock
          tone="neutral"
          icon="videocam-off-outline"
          title="Image and text posts unchanged"
          message="Video is a single-item media type: one video per post, no mixing with photos. Posts without video keep today's exact pipeline."
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>4. Loading — processing phases</StateHeading>
        <SurfaceCard tone="white" padding={spacing.lg}>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Compressing 42% → Sampling frames 4/9 → Uploading 78%. The composer add-tile shows the
            live phase; publish stays disabled until the direct-to-R2 upload completes.
          </Text>
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>5. Self — live XHS player (autoplay/loop/seek/actions rail)</StateHeading>
        <GradientButton label="Open sample video" onPress={() => setPlayerOpen(true)} />
        <Text style={[typography.caption, { color: colors.textSubtle }]}>
          Tap toggles pause · drag the bar to seek · swipe down or ✕ to close · rail = like /
          comments / save / share
        </Text>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>6. Other — reviewer view</StateHeading>
        <SurfaceCard tone="white" padding={spacing.lg}>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Settings → Admin → Content moderation → Videos tab: uncertain videos queue there with
            the same player plus Approve / Reject; rejection pushes a notification to the author.
          </Text>
        </SurfaceCard>
      </View>

      <VideoFullscreenModal
        visible={playerOpen}
        sourceUrl={SAMPLE_VIDEO}
        onClose={() => setPlayerOpen(false)}
        actions={{
          helpfulCount: helpful ? 13 : 12,
          viewerMarkedHelpful: helpful,
          onToggleHelpful: () => setHelpful((v) => !v),
          commentCount: 4,
          onOpenComments: () => setPlayerOpen(false),
          viewerSaved: saved,
          onToggleSave: () => setSaved((v) => !v),
          onShare: () => setPlayerOpen(false),
        }}
      />
    </Screen>
  );
}
