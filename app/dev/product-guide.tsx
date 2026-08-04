import { Text, View } from 'react-native';

import {
  GuidePublishConfirmCard,
  GuideStepCard,
  SpotlightRing,
  SpotlightScrim,
} from '../../components/guide/GuideSpotlight';
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

// A framed stage that fakes one spotlight moment: mock control + scrim hole +
// ring + step card, all statically positioned (no store, no measuring).
function SpotlightStage({
  stepNumber,
  title,
  body,
  progressTemplate,
  backLabel,
  skipAllLabel,
  continueLabel,
  showBack,
  targetLabel,
}: {
  stepNumber: number;
  title: string;
  body: string;
  progressTemplate: string;
  backLabel: string;
  skipAllLabel: string;
  continueLabel: string;
  showBack: boolean;
  targetLabel: string;
}) {
  const hole = { x: 96, y: 36, width: 148, height: 67 };
  return (
    <View
      style={{
        height: 360,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#FFF8F1',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: hole.x + 6,
          top: hole.y + 6,
          width: hole.width - 12,
          height: hole.height - 12,
          borderRadius: (hole.height - 12) / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.brandCoral,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>{targetLabel}</Text>
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none">
        <SpotlightScrim hole={hole} />
        <SpotlightRing hole={hole} radius="pill" />
      </View>
      <GuideStepCard
        stepNumber={stepNumber}
        stepCount={6}
        title={title}
        body={body}
        progressTemplate={progressTemplate}
        backLabel={backLabel}
        skipAllLabel={skipAllLabel}
        continueLabel={continueLabel}
        showBack={showBack}
        onBack={noop}
        onSkipAll={noop}
        onContinue={noop}
        style={{ position: 'absolute', left: 16, right: 16, top: hole.y + hole.height + 14 }}
      />
    </View>
  );
}

export default function ProductGuideGallery() {
  return (
    <Screen
      header={(
        <PageHeader
          title="Spotlight walkthrough"
          subtitle="Normal · long German · empty · loading · self · other"
        />
      )}
      scroll
      bottomGap={spacing['2xl']}
      contentStyle={{ paddingHorizontal: spacing.xl, gap: spacing['2xl'] }}
    >
      <View style={{ gap: spacing.md }}>
        <StateHeading>1. Normal — compose-entry step (Skip link + Continue button)</StateHeading>
        <SpotlightStage
          stepNumber={1}
          title="Start with your first post"
          body="Tap this button to start your first post."
          progressTemplate="Step {current} of {total}"
          backLabel="Back"
          skipAllLabel="Skip the tour"
          continueLabel="Continue"
          showBack={false}
          targetLabel="＋ Post"
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>2. Long German — back link + long labels wrap</StateHeading>
        <SpotlightStage
          stepNumber={5}
          title="Füge den Ort hinzu, an dem deine Geschichte passiert ist"
          body="Wenn deine Geschichte an einem bestimmten Ort passiert ist, füge ihn hinzu, damit andere ihn finden können. Sonst tippe einfach auf Weiter."
          progressTemplate="Schritt {current} von {total}"
          backLabel="Zurück"
          skipAllLabel="Einführung überspringen"
          continueLabel="Weiter"
          showBack
          targetLabel="Ort hinzufügen"
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>3. Empty — guide completed or skipped</StateHeading>
        <StateBlock
          tone="neutral"
          icon="checkmark-circle-outline"
          title="Nothing is rendered"
          message="Once product_guide_version reaches the current version, no overlay mounts anywhere. The plaza header keeps a small permanent re-entry button."
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>4. Loading — never blocks</StateHeading>
        <SurfaceCard tone="white" padding={spacing.lg}>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Guide telemetry and the completion PATCH are fire-and-forget: steps advance locally in
            the same frame as the user&apos;s real action, so there is no spinner state to design for.
          </Text>
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>5. Self — publish confirm sheet (the guide never auto-publishes)</StateHeading>
        <View style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(36,26,22,0.30)', paddingTop: 40 }}>
          <GuidePublishConfirmCard
            title="Publish this post?"
            body="Once published it appears on Plaza. You can also go back and double-check first."
            confirmLabel="Publish"
            cancelLabel="Check again"
            onConfirm={noop}
            onCancel={noop}
          />
        </View>
      </View>

      <View style={{ gap: spacing.md }}>
        <StateHeading>6. Other — settings re-entry row</StateHeading>
        <SurfaceCard tone="white" padding={0}>
          <SettingsRow
            icon="flag-outline"
            label="Getting-started tips"
            hint="Replay the first-post walkthrough"
            onPress={noop}
          />
        </SurfaceCard>
      </View>
    </Screen>
  );
}
